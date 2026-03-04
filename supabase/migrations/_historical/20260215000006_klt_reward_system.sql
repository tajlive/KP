-- KLT Reward System Integration
-- Automatically award KLT tokens for course progress and quiz completion

-- 1. FUNCTION TO AWARD KLT REWARDS
CREATE OR REPLACE FUNCTION award_klt_reward(
  p_user_id UUID,
  p_category_id VARCHAR,
  p_description_suffix TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_category RECORD;
  v_amount INTEGER;
  v_description TEXT;
  v_daily_count INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check if user exists (profiles table)
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- 1. Get category info
  SELECT * INTO v_category FROM klt_earning_categories WHERE id = p_category_id AND is_active = TRUE;
  
  IF v_category IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive category: ' || p_category_id);
  END IF;
  
  v_amount := v_category.amount;
  v_description := v_category.name_no;
  
  IF p_description_suffix IS NOT NULL THEN
    v_description := v_description || ': ' || p_description_suffix;
  END IF;

  -- 2. Check daily max (if applicable)
  IF v_category.max_per_day IS NOT NULL AND v_category.max_per_day > 0 THEN
    SELECT COUNT(*) INTO v_daily_count 
    FROM klt_transactions 
    WHERE user_id = p_user_id 
      AND category = p_category_id 
      AND created_at >= CURRENT_DATE;
      
    IF v_daily_count >= v_category.max_per_day THEN
      RETURN jsonb_build_object('success', false, 'error', 'Daily limit reached for ' || p_category_id);
    END IF;
  END IF;

  -- 3. Check cooldown (if applicable)
  IF v_category.cooldown_minutes > 0 THEN
    IF EXISTS (
      SELECT 1 FROM klt_transactions 
      WHERE user_id = p_user_id 
        AND category = p_category_id 
        AND created_at >= NOW() - (v_category.cooldown_minutes * INTERVAL '1 minute')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cooldown active for ' || p_category_id);
    END IF;
  END IF;

  -- 4. Prevent double rewards for same lesson/quiz if specified in metadata
  IF p_metadata ? 'lesson_id' THEN
    IF EXISTS (
      SELECT 1 FROM klt_transactions 
      WHERE user_id = p_user_id 
        AND category = p_category_id 
        AND (metadata->>'lesson_id') = (p_metadata->>'lesson_id')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed for this lesson: ' || (p_metadata->>'lesson_id'));
    END IF;
  END IF;

  -- 5. Award Reward
  -- Create or update balance
  INSERT INTO user_klt_balances (user_id, balance, total_earned)
  VALUES (p_user_id, v_amount, v_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_klt_balances.balance + v_amount,
    total_earned = user_klt_balances.total_earned + v_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO klt_transactions (user_id, amount, type, category, description, metadata)
  VALUES (p_user_id, v_amount, 'reward', p_category_id, v_description, p_metadata);
  
  RETURN jsonb_build_object(
    'success', true, 
    'amount', v_amount, 
    'category', p_category_id,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ENHANCED PROGRESS TRIGGER
-- This replaces/enhances existing triggers to include KLT rewards
CREATE OR REPLACE FUNCTION handle_progress_klt_rewards()
RETURNS TRIGGER AS $$
DECLARE
  v_lesson_record RECORD;
BEGIN
  -- Only trigger on completion transition (false -> true)
  IF NEW.is_completed AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) AND NEW.lesson_id IS NOT NULL THEN
    
    -- Fetch lesson details
    SELECT title, content_type INTO v_lesson_record FROM lessons WHERE id = NEW.lesson_id;
    
    -- A. Award for Lesson Completion
    PERFORM award_klt_reward(
      NEW.user_id, 
      'lesson_complete', 
      v_lesson_record.title, 
      jsonb_build_object('lesson_id', NEW.lesson_id, 'course_id', NEW.course_id)
    );
    
    -- B. Award for Quiz Pass (if it's a quiz)
    IF v_lesson_record.content_type = 'quiz' THEN
      PERFORM award_klt_reward(
        NEW.user_id, 
        'quiz_pass', 
        v_lesson_record.title, 
        jsonb_build_object('lesson_id', NEW.lesson_id, 'course_id', NEW.course_id, 'is_quiz', true)
      );
    END IF;

    -- C. Achievement Trigger (Optional but good integration)
    PERFORM award_achievement(
      NEW.user_id,
      'first_lesson',
      'Første Leksjon',
      'Fullført din første leksjon',
      '📚'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS trigger_klt_rewards ON user_course_progress;
CREATE TRIGGER trigger_klt_rewards
  AFTER UPDATE ON user_course_progress
  FOR EACH ROW
  EXECUTE FUNCTION handle_progress_klt_rewards();

-- 3. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION award_klt_reward(UUID, VARCHAR, TEXT, JSONB) TO authenticated;

-- Comment
COMMENT ON FUNCTION award_klt_reward IS 'Safe function to award KLT tokens for various activities with limit checking';

-- Verify
SELECT 'KLT Backend reward logic implemented for lessons and quizzes.' as status;
