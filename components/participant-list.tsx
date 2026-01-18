'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

interface Participant {
  id: string;
  user_name: string;
  created_at: string;
  is_reach: boolean;
  bingo_rank: number | null;
  bingo_card: any;
}

interface ParticipantListProps {
  gameId: string | null;
}

export default function ParticipantList({ gameId }: ParticipantListProps) {
  const supabase = createClient();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('id, user_name, created_at, is_reach, bingo_rank, bingo_card')
        .eq('game_id', gameId)
        .not('bingo_card', 'is', null) // カード選択済みの参加者のみ
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
      } else {
        setParticipants(data || []);
      }
    };

    // 初回取得
    fetchParticipants();

    // リアルタイム更新（改善版：エラーハンドリングとログ追加）
    const channel = supabase
      .channel(`participants-list-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `game_id=eq.${gameId}` },
        (payload) => {
          console.log('Participant list change detected:', payload);
          fetchParticipants();
        }
      )
      .subscribe((status) => {
        console.log('Participant list channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to participant list updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to participant list updates');
        }
      });

    return () => {
      console.log('Unsubscribing from participant list channel');
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  if (!gameId) return null;

  return (
    <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-gray-600 mb-1">現在の参加者数:</p>
          <p className="text-2xl font-bold text-blue-600 tracking-widest">
            {participants.length}名
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-2 text-xs font-semibold text-blue-600 bg-white rounded-md hover:bg-blue-50 transition"
        >
          {isExpanded ? '▲ 閉じる' : '▼ 一覧を表示'}
        </button>
      </div>

      {participants.length < 2 && (
        <p className="text-xs text-red-600 mt-2">
          ⚠️ 2名以上で抽選を開始できます
        </p>
      )}

      {isExpanded && (
        <div className="mt-3 bg-white rounded-lg p-3 max-h-60 overflow-y-auto">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">参加者一覧</h4>
          {participants.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              まだ参加者がいません
            </p>
          ) : (
            <ul className="space-y-2">
              {participants.map((participant, index) => (
                <li
                  key={participant.id}
                  className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">
                      {index + 1}.
                    </span>
                    <span className="text-gray-800">{participant.user_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.bingo_rank && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 text-yellow-900 rounded">
                        {participant.bingo_rank}位
                      </span>
                    )}
                    {participant.is_reach && !participant.bingo_rank && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-orange-400 text-orange-900 rounded">
                        リーチ
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
