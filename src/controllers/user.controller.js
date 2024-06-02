const players = require("../../data/players.json");
const match = require("../../data/match.json");

const { connectDB } = require("../db");

const DB_COLLECTION_NAME1 = "teams";

const playerJson = JSON.stringify(players);
const matchJson = JSON.stringify(match);

const playerList = JSON.parse(playerJson);
const matchData = JSON.parse(matchJson);

const playersObj = {};
const playersRoleObj = {};

for (const player of playerList) {
  playersObj[player.Player] = player.Team;
  playersRoleObj[player.Player] = player.Role;
}

const addTeam = async (req, res) => {
  const { teamName, players, captain, viceCaptain } = req.body;

  if (players.length !== 11) {
    return res.status(400).send("Team should consist of exactly 11 players");
  }

  const moreThanTen = await validatePlayersCount(players);
  if (moreThanTen) {
    return res
      .status(400)
      .send("More than ten players from the same team are not allowed");
  }

  const invalidRoles = await validatePlayersRole(players);
  if (invalidRoles.length > 0) {
    return res
      .status(400)
      .send(`Invalid player roles: ${invalidRoles.join(", ")}`);
  }

  const team = {
    TeamName: teamName,
    Players: players,
    Captain: captain,
    ViceCaptain: viceCaptain,
  };

  const db = await connectDB();
  await db.collection(DB_COLLECTION_NAME1).insertOne(team);
  res.send("Team is valid and has been added successfully");
};

const processResult = async (req, res) => {
  const db = await connectDB();
  const newTeam = await db.collection(DB_COLLECTION_NAME1).findOne();

  const playPointsObj = {};
  let total_runs = 0;

  console.log(newTeam);
  newTeam.Players.forEach((player) => {
    const points = calculatePoints(player, matchData);
    playPointsObj[player] = points;
  });

  console.log(playPointsObj);

  if (newTeam?.Captain) {
    playPointsObj[newTeam.Captain] *= 2;
  }
  if (newTeam?.ViceCaptain) {
    playPointsObj[newTeam.ViceCaptain] *= 1.5;
  }

  for (const key in playPointsObj) {
    total_runs += playPointsObj[key];
  }

  const entry = {
    teamName: newTeam.TeamName,
    players: newTeam.Players,
    captain: newTeam.Captain,
    viceCaptain: newTeam.ViceCaptain,
    points: total_runs,
  };

  const processedResult = await db.collection("results").insertOne(entry);

  console.log("Result processed and saved into DB");

  res.status(200).send("Result processed and saved into DB");
};

const teamResult = async (req , res) => {
  const db = await connectDB();
  const maxPoints = await db.collection("results").aggregate([
    {
      $sort: {
        points: -1,
      },
    },
  ]).toArray()
const maxPoint = maxPoints[0].points
const winningTeams = await db.collection("results").find({ points: maxPoint }).project({ teamName: 1, _id: 0 }).toArray();

const winningTeamNames = winningTeams.map(team => team.teamName);

const winnerMessage = winningTeamNames.length > 1 
  ? `The winners are: ${winningTeamNames.join(', ')} with ${maxPoint} points`
  : `The winner is: ${winningTeamNames[0]} with ${maxPoint} points `;

console.log(winnerMessage);

return res.status(200).send(winnerMessage);
};



async function validatePlayersCount(players) {
    const teamCount = {};
  
    players.forEach((player) => {
      const team = playersObj[player];
      teamCount[team] = (teamCount[team] || 0) + 1;
    });
  
    for (const team in teamCount) {
      if (teamCount[team] > 10) {
        console.log("More than 10 players from the same team");
        return true;
      }
    }
  
    console.log("Team count validation successful");
    return false;
  }
  
async function validatePlayersRole(players) {
    const roleCountObj = {};
  
    players.forEach((player) => {
      const role = playersRoleObj[player];
      if (role) {
        roleCountObj[role] = (roleCountObj[role] || 0) + 1;
      }
    });
  
    const roleLimits = {
      "WICKETKEEPER": [1, 8],
      "BATTER": [1, 8],
      "ALL-ROUNDER": [1, 8],
      "BOWLER": [1, 8],
    };
  
    const invalidRoles = [];
  
    for (const role in roleLimits) {
      const [min, max] = roleLimits[role];
      const count = roleCountObj[role] || 0;
      if (count < min || count > max) {
        console.log(
          `For ${role}, ${count} players are not allowed. Min ${min} and max ${max} players are allowed`
        );
        invalidRoles.push(`${role}: ${count} (Min: ${min}, Max: ${max})`);
      }
    }
  
    return invalidRoles;
  }
  
function calculatePoints(player, matchData) {
    let points = 0;
  
    matchData.forEach((ball) => {
      if (ball.batter === player) {
        points += ball.total_run;
      }
      if (ball.bowler === player && ball.isWicketDelivery) {
        points += 25;
        if (ball.kind === "bowled" || ball.kind === "lbw") {
          points += 8;
        }
      }
      if (ball.fielders_involved && ball.fielders_involved.includes(player)) {
        points += 8;
        if (ball.kind === "stumped" || ball.kind === "run out") {
          points += 12;
        }
      }
    });
  
    return points;
  }

  

module.exports = {
  addTeam,
  processResult, 
  teamResult,
};
