'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

// Define the ReachPlayer type
interface ReachPlayer {
  id: string;
  user_name: string;
  is_reach: boolean;
}

interface ReachListProps {
  gameId: string | null;
}

export default function ReachList({ gameId }: ReachListProps) {
  const supabase = createClient();
  const [reachPlayers, setReachPlayers] = useState<ReachPlayer[]>([]);

  useEffect(() => {
    if (!gameId) return;

    // Function to fetch reach players
    const fetchReachPlayers = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('id, user_name, is_reach')
        .eq('game_id', gameId)
        .eq('is_reach', true)
        .is('bingo_rank', null) // リーチでビンゴ未達成の人のみ
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching reach players:', error);
      } else {
        setReachPlayers(data || []);
      }
    };

    // Fetch initial reach players
    fetchReachPlayers();

    // Set up real-time subscription for any changes in the participants table
    const channel = supabase
      .channel(`reach-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `game_id=eq.${gameId}` },
        () => {
          // When a change occurs, re-fetch the reach players to update the list
          fetchReachPlayers();
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  if (reachPlayers.length === 0) {
    return null; // リーチ者がいない場合は何も表示しない
  }

  return (
    <div className="w-full p-4 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg shadow-md border-2 border-orange-400 animate-pulse-slow">
      <h2 className="text-xl font-bold text-center text-orange-800 mb-3">
        REACH!
      </h2>
      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto list-fade-bottom">
        {reachPlayers.map((player) => (
          <div
            key={player.id}
            className="p-1 bg-white rounded-lg shadow text-center"
          >
            <span className="text-sm font-semibold text-orange-600 truncate">
              {player.user_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
