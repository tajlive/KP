"use client";

/**
 * useRealtime — subscribe to Supabase Realtime channels for database changes.
 * Used for bot status updates, copy-trade events, marketplace changes.
 */

import { createClient } from "@/lib/supabase/client";
import { useRealtimeStore } from "@/store/realtime-store";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  table: string;
  schema?: string;
  event?: PostgresEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T, old: Partial<T>) => void;
  onDelete?: (payload: Partial<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

interface UseRealtimeReturn {
  isSubscribed: boolean;
  channel: RealtimeChannel | null;
}

export function useRealtime<T extends Record<string, unknown>>(
  options: UseRealtimeOptions<T>,
): UseRealtimeReturn {
  const {
    table,
    schema = "public",
    event = "*",
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Stable callback refs
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channelName = `realtime:${table}:${filter ?? "all"}`;

    const channelConfig: {
      event: PostgresEvent;
      schema: string;
      table: string;
      filter?: string;
    } = { event, schema, table };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Fire specific callbacks
          if (payload.eventType === "INSERT" && onInsertRef.current) {
            onInsertRef.current(payload.new as T);
          } else if (payload.eventType === "UPDATE" && onUpdateRef.current) {
            onUpdateRef.current(payload.new as T, payload.old as Partial<T>);
          } else if (payload.eventType === "DELETE" && onDeleteRef.current) {
            onDeleteRef.current(payload.old as Partial<T>);
          }

          // Fire generic callback
          onChangeRef.current?.(payload);
        },
      )
      .subscribe((status) => {
        const connected = status === "SUBSCRIBED";
        setIsSubscribed(connected);
        if (connected) {
          useRealtimeStore.getState().setSupabaseStatus("connected");
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel).catch((err: unknown) => {
        console.warn("[useRealtime] removeChannel error:", err);
      });
      channelRef.current = null;
      setIsSubscribed(false);
    };
  }, [table, schema, event, filter, enabled]);

  return { isSubscribed, channel: channelRef.current };
}

/**
 * Subscribe to a custom Supabase Realtime broadcast channel.
 * Used for events that aren't tied to specific database tables.
 */
export function useRealtimeBroadcast<T>(
  channelName: string,
  eventName: string,
  callback: (payload: T) => void,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: eventName }, (payload) => {
        callbackRef.current(payload.payload as T);
      })
      .subscribe((status) => {
        setIsSubscribed(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [channelName, eventName, enabled]);

  return { isSubscribed };
}

/**
 * Hook to send broadcast events to a Supabase Realtime channel.
 */
export function useRealtimeSend(channelName: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelName).subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName]);

  const send = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      channelRef.current?.send({ type: "broadcast", event, payload });
    },
    [],
  );

  return { send };
}
