import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TablesInsert, Tables } from '@/types/database';

export interface RaceData extends Tables<'races'> {}
export interface TriggerData extends Tables<'race_triggers'> {}

export const useSupabaseService = (sessionCode: string) => {
  const [currentRace, setCurrentRace] = useState<RaceData | null>(null);
  const [triggers, setTriggers] = useState<TriggerData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new race session
  const createRace = useCallback(async (hostId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('races')
        .insert({
          session_code: sessionCode,
          host_id: hostId,
          status: 'lobby'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentRace(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create race';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionCode]);

  // Update race status
  const updateRaceStatus = useCallback(async (status: string, startTime?: Date, endTime?: Date) => {
    if (!currentRace) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const updateData: any = { status };
      
      if (startTime) updateData.start_time = startTime.toISOString();
      if (endTime) {
        updateData.end_time = endTime.toISOString();
        if (startTime) {
          updateData.duration_ms = endTime.getTime() - startTime.getTime();
        }
      }
      
      const { data, error } = await supabase
        .from('races')
        .update(updateData)
        .eq('id', currentRace.id)
        .select()
        .single();

      if (error) throw error;
      
      setCurrentRace(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update race';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentRace]);

  // Record a trigger event
  const recordTrigger = useCallback(async (
    gateRole: 'START' | 'FINISH',
    gateId: string,
    clientTimestamp: number,
    confidence: number = 1.0
  ) => {
    if (!currentRace) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const triggerData: TablesInsert<'race_triggers'> = {
        race_id: currentRace.id,
        gate_role: gateRole,
        gate_id: gateId,
        trigger_time: new Date().toISOString(),
        client_timestamp: clientTimestamp,
        confidence
      };
      
      const { data, error } = await supabase
        .from('race_triggers')
        .insert(triggerData)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record trigger';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentRace]);

  // Calculate race duration from triggers
  const calculateRaceDuration = useCallback(() => {
    const startTrigger = triggers.find(t => t.gate_role === 'START');
    const finishTrigger = triggers.find(t => t.gate_role === 'FINISH');
    
    if (startTrigger && finishTrigger) {
      return finishTrigger.client_timestamp - startTrigger.client_timestamp;
    }
    
    return null;
  }, [triggers]);

  // Load existing race for this session
  const loadRace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('races')
        .select('*')
        .eq('session_code', sessionCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }
      
      if (data) {
        setCurrentRace(data);
        
        // Load existing triggers for this race
        const { data: triggerData, error: triggerError } = await supabase
          .from('race_triggers')
          .select('*')
          .eq('race_id', data.id)
          .order('created_at', { ascending: true });
          
        if (triggerError) throw triggerError;
        
        setTriggers(triggerData || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load race';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionCode]);

  // Initialize on mount
  useEffect(() => {
    loadRace();
  }, [loadRace]);

  // Set up realtime subscription when race changes
  useEffect(() => {
    if (!currentRace) return;
    
    // Create new subscription
    const newChannel = supabase
      .channel(`race-${currentRace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'race_triggers',
          filter: `race_id=eq.${currentRace.id}`
        },
        (payload) => {
          const newTrigger = payload.new as TriggerData;
          setTriggers(prev => [...prev, newTrigger]);
        }
      )
      .subscribe();

    // Clean up function
    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [currentRace]); // Only depend on currentRace

  return {
    currentRace,
    triggers,
    isLoading,
    error,
    createRace,
    updateRaceStatus,
    recordTrigger,
    calculateRaceDuration,
    loadRace
  };
};