const scoreboards = new Map();

export const getScoreboard = (pin) => {
  if (!scoreboards.has(pin)) {
    scoreboards.set(pin, {
      players: {},
      questionStartTime: null,
      answeredThisRound: null,
    });
  }
  return scoreboards.get(pin);
};

export const deleteScoreboard = (pin) => {
  scoreboards.delete(pin);
};

export const startQuestion = (pin, startTime) => {
  const sb = getScoreboard(pin);
  sb.questionStartTime = startTime;
  sb.answeredThisRound = new Set();
  for (const playerId of Object.keys(sb.players)) {
    sb.players[playerId].lastResult = null;
  }
};

export const recordAnswer = (pin, { playerId, username, isCorrect, responseTimeMs, questionDurationMs }) => {
  const sb = getScoreboard(pin);
  if (!sb.players[playerId]) {
    sb.players[playerId] = { username, score: 0, currentStreak: 0, lastPlacement: 0, lastResult: null };
  }

  const player = sb.players[playerId];
  player.username = username;
  if (sb.answeredThisRound) {
    sb.answeredThisRound.add(playerId);
  }

  if (!isCorrect) {
    player.currentStreak = 0;
    const result = { pointsAwarded: 0, speedPoints: 0, streakBonus: 0, cumulativeScore: player.score, isCorrect: false };
    player.lastResult = result;
    return result;
  }

  const speedRatio = Math.min(responseTimeMs / questionDurationMs, 1);
  const speedPoints = Math.round(1000 - speedRatio * 500);
  const streakBonus = player.currentStreak >= 2 ? 100 : 0;
  const pointsAwarded = speedPoints + streakBonus;

  player.score += pointsAwarded;
  player.currentStreak += 1;

  const result = { pointsAwarded, speedPoints, streakBonus, cumulativeScore: player.score, isCorrect: true };
  player.lastResult = result;
  return result;
};

export const compileLeaderboard = (pin) => {
  const sb = getScoreboard(pin);
  const entries = Object.entries(sb.players || {});

  if (entries.length === 0) return [];

  entries.sort(([, a], [, b]) => b.score - a.score);

  return entries.map(([playerId, entry], index) => {
    const newPlacement = index + 1;
    const change = entry.lastPlacement > 0 ? entry.lastPlacement - newPlacement : 0;
    const changeLabel =
      change > 0 ? `Up ${change} Places` : change < 0 ? `Down ${Math.abs(change)} Places` : "No Change";

    sb.players[playerId].lastPlacement = newPlacement;

    return {
      playerId,
      username: entry.username,
      score: entry.score,
      currentStreak: entry.currentStreak,
      placement: newPlacement,
      positionChange: change,
      changeLabel,
    };
  });
};

export const finalizeUnansweredPlayers = (pin) => {
  const sb = getScoreboard(pin);
  if (!sb.answeredThisRound) return;

  for (const playerId of Object.keys(sb.players)) {
    if (!sb.answeredThisRound.has(playerId)) {
      sb.players[playerId].currentStreak = 0;
    }
  }
};

export const hasAnsweredThisRound = (pin, playerId) => {
  const sb = getScoreboard(pin);
  if (!sb.answeredThisRound) return false;
  return sb.answeredThisRound.has(playerId);
};

export const allAnsweredThisRound = (pin, totalNonHostPlayers) => {
  const sb = getScoreboard(pin);
  if (!sb.answeredThisRound) return false;
  return sb.answeredThisRound.size >= totalNonHostPlayers;
};
