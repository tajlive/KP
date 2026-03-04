'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    createSimulation,
    getActiveSimulation,
    endSimulation,
    getSimulationStats
} from '@/lib/paper-trading/supabase';
import { PaperSimulation, RiskLevel } from '@/types/paper-trading';
import { useAuth } from '@/hooks/useAuth';

export function usePaperTrading() {
    const { user } = useAuth();
    const [simulation, setSimulation] = useState<PaperSimulation | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<unknown>(null);

    const fetchSimulation = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const active = await getActiveSimulation(user.id);
            setSimulation(active);

            if (active) {
                const s = await getSimulationStats(active.id);
                setStats(s);
            }
        } catch (error) {
            console.error('Error fetching simulation:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSimulation();
    }, [fetchSimulation]);

    const startAutoTrade = async (riskLevel: RiskLevel) => {
        if (!user) return;
        try {
            // End existing if present (safety check)
            if (simulation) {
                await endSimulation(simulation.id);
            }

            const newSim = await createSimulation(user.id, riskLevel);
            if (newSim) {
                setSimulation(newSim);
                await fetchSimulation();
            }
            return newSim;
        } catch (error) {
            console.error('Error starting auto trade:', error);
            throw error;
        }
    };

    const stopAutoTrade = async () => {
        if (!simulation) return;
        try {
            await endSimulation(simulation.id);
            setSimulation(null);
            setStats(null);
        } catch (error) {
            console.error('Error stopping auto trade:', error);
            throw error;
        }
    };

    return {
        simulation,
        loading,
        stats,
        startAutoTrade,
        stopAutoTrade,
        refresh: fetchSimulation
    };
}
