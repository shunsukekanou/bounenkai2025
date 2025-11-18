'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

// Define the Winner type
interface Winner {
  id: string;
  user_name: string;
  bingo_rank: number;
}

interface WinnerListProps {
  gameId: string | null;
}

export default function WinnerList({ gameId }: WinnerListProps) {
  const supabase = createClient();
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    if (!gameId) return;

    // Function to fetch winners
    const fetchWinners = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('id, user_name, bingo_rank')
        .eq('game_id', gameId)
        .not('bingo_rank', 'is', null)
        .order('bingo_rank', { ascending: true });

      if (error) {
        console.error('Error fetching winners:', error);
      } else {
        setWinners(data || []);
      }
    };

    // Fetch initial winners
    fetchWinners();

    // Set up real-time subscription for any changes in the participants table
    const channel = supabase
      .channel(`winners-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `game_id=eq.${gameId}` },
        () => {
          // When a change occurs, re-fetch the winners to update the list
          fetchWinners();
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  const getRankSuffix = (rank: number) => {
    if (rank % 10 === 1 && rank % 100 !== 11) return 'st';
    if (rank % 10 === 2 && rank % 100 !== 12) return 'nd';
    if (rank % 10 === 3 && rank % 100 !== 13) return 'rd';
    return 'th';
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
        BINGO RANKING
      </h2>
      {winners.length === 0 ? (
        <p className="text-center text-gray-500">まだビンゴの人はいません...</p>
      ) : (
        <ol className="space-y-3 max-h-48 overflow-y-auto list-fade-bottom">
          {winners.map((winner) => (
            <li
              key={winner.id}
              className="flex items-center justify-between p-3 bg-yellow-100 rounded-lg shadow animate-fade-in"
            >
              <span className="text-xl font-bold text-yellow-700">
                {winner.bingo_rank}
                <sup className="text-xs">{getRankSuffix(winner.bingo_rank)}</sup>
              </span>
              <span className="text-base font-semibold text-gray-800">
                {winner.user_name}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
