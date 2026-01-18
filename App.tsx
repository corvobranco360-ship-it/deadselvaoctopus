
import React, { useState, useEffect } from 'react';
import { GameState } from './types';
import { LEVELS } from './constants';
import GameComponent from './GameComponent';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(1);

  useEffect(() => {
    const saved = localStorage.getItem('forestSurvivorProgress');
    if (saved) {
      setUnlockedLevels(parseInt(saved, 10));
    }
  }, []);

  const handleLevelComplete = () => {
    if (currentLevelIndex + 1 >= LEVELS.length) {
      setGameState(GameState.VICTORY);
    } else {
      const nextLevel = currentLevelIndex + 2;
      if (nextLevel > unlockedLevels) {
        setUnlockedLevels(nextLevel);
        localStorage.setItem('forestSurvivorProgress', nextLevel.toString());
      }
      setCurrentLevelIndex(currentLevelIndex + 1);
      setGameState(GameState.PLAYING);
    }
  };

  const startLevel = (index: number) => {
    setCurrentLevelIndex(index);
    setGameState(GameState.PLAYING);
  };

  const renderUI = () => {
    switch (gameState) {
      case GameState.MENU:
        return (
          <div className="flex flex-col items-center justify-center h-full bg-[#1a1a1a] text-white p-4">
            <h1 className="text-3xl md:text-5xl mb-8 text-green-500 text-center leading-relaxed">FOREST SURVIVOR</h1>
            <div className="space-y-4 flex flex-col items-center">
              <button 
                onClick={() => setGameState(GameState.LEVEL_SELECT)}
                className="bg-green-600 hover:bg-green-700 px-8 py-4 pixel-border transition-all active:scale-95"
              >
                START GAME
              </button>
              <p className="text-[10px] mt-8 opacity-50 text-center">Keyboard: Arrows/WASD to move, Z/Space to jump, X to shoot, C for trap</p>
            </div>
          </div>
        );

      case GameState.LEVEL_SELECT:
        return (
          <div className="flex flex-col items-center justify-center h-full bg-[#1a1a1a] text-white p-4">
            <h2 className="text-2xl mb-8">SELECT LEVEL</h2>
            <div className="grid grid-cols-5 gap-4">
              {LEVELS.map((level, idx) => {
                const isLocked = idx + 1 > unlockedLevels;
                return (
                  <button
                    key={level.id}
                    disabled={isLocked}
                    onClick={() => startLevel(idx)}
                    className={`w-12 h-12 flex items-center justify-center pixel-border ${
                      isLocked ? 'bg-gray-800 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'
                    }`}
                  >
                    {level.id}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setGameState(GameState.MENU)}
              className="mt-8 text-sm underline opacity-70 hover:opacity-100"
            >
              BACK TO MENU
            </button>
          </div>
        );

      case GameState.GAME_OVER:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-50">
            <h2 className="text-4xl text-red-600 mb-8">GAME OVER</h2>
            <button 
              onClick={() => setGameState(GameState.PLAYING)}
              className="bg-red-600 hover:bg-red-700 px-8 py-4 pixel-border mb-4"
            >
              TRY AGAIN
            </button>
            <button 
              onClick={() => setGameState(GameState.LEVEL_SELECT)}
              className="bg-gray-700 hover:bg-gray-800 px-6 py-2 pixel-border text-xs"
            >
              LEVEL SELECT
            </button>
          </div>
        );

      case GameState.VICTORY:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 text-white z-50">
            <h2 className="text-4xl text-yellow-400 mb-8">YOU SURVIVED!</h2>
            <p className="mb-8">All levels cleared.</p>
            <button 
              onClick={() => setGameState(GameState.MENU)}
              className="bg-yellow-500 hover:bg-yellow-600 px-8 py-4 pixel-border text-black"
            >
              MAIN MENU
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {gameState === GameState.PLAYING ? (
        <GameComponent 
          levelIndex={currentLevelIndex} 
          onGameOver={() => setGameState(GameState.GAME_OVER)}
          onLevelComplete={handleLevelComplete}
        />
      ) : (
        renderUI()
      )}
    </div>
  );
};

export default App;
