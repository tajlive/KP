/**
 * User Management Tools - Search, update, and manage users
 */

import { getSupabase } from '../clients/supabase.ts';
import type { ToolOutput, User } from '../types.ts';

export async function searchUsers(args: { query: string; filter: string }): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    let query = supabase
      .from('profiles')
      .select('*, klt_balances(balance)');
    
    switch (args.filter) {
      case 'email':
        query = query.ilike('email', `%${args.query}%`);
        break;
      case 'name':
        query = query.ilike('full_name', `%${args.query}%`);
        break;
      case 'status':
        query = query.eq('status', args.query);
        break;
      default:
        // Search across multiple fields
        query = query.or(`email.ilike.%${args.query}%,full_name.ilike.%${args.query}%`);
    }
    
    const { data, error } = await query.limit(20);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        content: [{ type: 'text', text: '🔍 No users found matching your query.' }],
      };
    }
    
    const users = (data as any[]).map((u, idx) => `
${idx + 1}. ${u.full_name || 'N/A'} (${u.email})
   ID: ${u.id}
   Status: ${u.status || 'active'}
   Role: ${u.role || 'student'}
   KLT: ${u.klt_balances?.balance || 0}
   Joined: ${new Date(u.created_at).toLocaleDateString('no-NO')}
`).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `🔍 Found ${data.length} user(s):\n${users}`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function updateUser(args: { user_id: string; updates: Record<string, any> }): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    // Validate allowed fields
    const allowedFields = ['full_name', 'role', 'status', 'metadata'];
    const updates: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(args.updates)) {
      if (allowedFields.includes(key)) {
        updates[key] = value;
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return {
        content: [{ type: 'text', text: '⚠️ No valid fields to update. Allowed: full_name, role, status, metadata' }],
        isError: true,
      };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', args.user_id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return {
        content: [{ type: 'text', text: `❌ User ${args.user_id} not found` }],
        isError: true,
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ User updated successfully!

User: ${data.full_name || data.email}
ID: ${data.id}
Updated fields: ${Object.keys(updates).join(', ')}
New values: ${JSON.stringify(updates, null, 2)}`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function grantFounderStatus(args: { user_id: string }): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    // Get user info
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', args.user_id)
      .single();
    
    if (userError || !user) {
      return {
        content: [{ type: 'text', text: `❌ User not found: ${args.user_id}` }],
        isError: true,
      };
    }
    
    // Check if already founder
    if (user.role === 'founder') {
      return {
        content: [{ type: 'text', text: `⚠️ User ${user.email} is already a founder.` }],
      };
    }
    
    // Update role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'founder', is_founder: true })
      .eq('id', args.user_id);
    
    if (updateError) throw updateError;
    
    // Award KLT tokens
    const { data: balance } = await supabase
      .from('klt_balances')
      .select('balance')
      .eq('user_id', args.user_id)
      .single();
    
    const currentBalance = balance?.balance || 0;
    const newBalance = currentBalance + 10000; // 10,000 founder tokens
    
    const { error: tokenError } = await supabase
      .from('klt_balances')
      .upsert({
        user_id: args.user_id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      });
    
    if (tokenError) throw tokenError;
    
    // Log transaction
    await supabase.from('klt_transactions').insert([{
      user_id: args.user_id,
      amount: 10000,
      type: 'award',
      reason: 'Founder status granted',
      created_at: new Date().toISOString(),
    }]);
    
    return {
      content: [{
        type: 'text',
        text: `🎉 Founder status granted!

User: ${user.full_name || user.email}
ID: ${args.user_id}

✅ Role updated to: founder
✅ Awarded: 10,000 KLT tokens
New balance: ${newBalance.toLocaleString()} KLT`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function banUser(args: { user_id: string; reason: string }): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    // Get user info first
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name, status')
      .eq('id', args.user_id)
      .single();
    
    if (userError || !user) {
      return {
        content: [{ type: 'text', text: `❌ User not found: ${args.user_id}` }],
        isError: true,
      };
    }
    
    if (user.status === 'banned') {
      return {
        content: [{ type: 'text', text: `⚠️ User ${user.email} is already banned.` }],
      };
    }
    
    // Update status to banned
    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'banned',
        banned_at: new Date().toISOString(),
        ban_reason: args.reason,
      })
      .eq('id', args.user_id);
    
    if (error) throw error;
    
    return {
      content: [{
        type: 'text',
        text: `🚫 User banned successfully

User: ${user.full_name || user.email}
ID: ${args.user_id}
Reason: ${args.reason}

⚠️ User can no longer log in or access the platform.`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function getUserDetails(args: { user_id: string }): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, klt_balances(balance), beta_signups(*)')
      .eq('id', args.user_id)
      .single();
    
    if (error || !data) {
      return {
        content: [{ type: 'text', text: `❌ User not found: ${args.user_id}` }],
        isError: true,
      };
    }
    
    const user = data as any;
    
    return {
      content: [{
        type: 'text',
        text: `👤 User Details

Basic Info:
  Name: ${user.full_name || 'N/A'}
  Email: ${user.email}
  ID: ${user.id}
  Status: ${user.status || 'active'}
  Role: ${user.role || 'student'}

KLT Tokens:
  Balance: ${user.klt_balances?.balance || 0}

Activity:
  Joined: ${new Date(user.created_at).toLocaleString('no-NO')}
  Last Active: ${user.last_active ? new Date(user.last_active).toLocaleString('no-NO') : 'Never'}

Signup Data:
  Student #: ${user.beta_signups?.student_nummer || 'N/A'}
  Experience: ${user.beta_signups?.erfaring || 'N/A'}
  Learning Goals: ${user.beta_signups?.laeringsmaal?.join(', ') || 'N/A'}

Metadata:
  ${JSON.stringify(user.metadata || {}, null, 2)}`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}
