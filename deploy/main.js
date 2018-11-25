/*******************************************************************************

	main.js
	Copyright (c) 2018 NiftyK LLC
	All Rights Reserved.
	
	The Peggy game board is made up of holes filled with pegs or marbles. In the code
	below, the terms peg, hole, slot are used interchangeably.
	
*******************************************************************************/

(function ($)
{

var mLog = document.getElementById("loginfo");
var mCanvas = document.getElementById("game-board");

const kIdleState 		= 0;
const kClickFromState 	= 1;
const kClickToState		= 2;
	
const kBorderWidth = 10; // How to get this from mCanvas? mCanvas.style.border.width doesn't work
const kStartingPegHole = 11;
const kPegHoleCount = 15;
const HOLE = ".";
const PEG = "O";
const mJumpMap =
{
	// This table is sorted by the "to", or destination, peg. Each table entry is a list
	// of possible moves to the peg. For example, peg hole 6 has two possible moves:
	// jumping from peg 1 (over peg 3) and jumping from peg 8 (over peg 7)
	0 : [{from:3,over:1,to:0 }, {from:5,over:2,to:0 }],
	1 : [{from:6,over:3,to:1 }, {from:8,over:4,to:1 }],
	2 : [{from:7,over:4,to:2 }, {from:9,over:5,to:2 }],
	3 : [{from:0,over:1,to:3 }, {from:5,over:4,to:3 }, {from:10,over:6,to:3 }, {from:12,over:7,to:3 }],
	4 : [{from:11,over:7,to:4 }, {from:13,over:8,to:4 }],
	5 : [{from:0,over:2,to:5 }, {from:3,over:4,to:5 }, {from:12,over:8,to:5 }, {from:14,over:9,to:5 }],
	6 : [{from:1,over:3,to:6 }, {from:8,over:7,to:6 }],
	7 : [{from:2,over:4,to:7 }, {from:9,over:8,to:7 }],
	8 : [{from:1,over:4,to:8 }, {from:6,over:7,to:8 }],
	9 : [{from:2,over:5,to:9 }, {from:7,over:8,to:9 }],
	10: [{from:3,over:6,to:10}, {from:12,over:11,to:10}],
	11: [{from:4,over:7,to:11}, {from:13,over:12,to:11}],
	12: [{from:3,over:7,to:12}, {from:5,over:8,to:12}, {from:10,over:11,to:12}, {from:14,over:13,to:12}],
	13: [{from:4,over:8,to:13}, {from:11,over:12,to:13}],
	14: [{from:5,over:9,to:14}, {from:12,over:13,to:14}]
};

const mFromToMap = new Map();

// This map keeps track of known peg boards. If a peg board is known to Peggy
// it will not be searched a second time for new moves. The map is made up
// of (key, value) pairs where key is a pegboard and value is an associated
// game node.
var mKnownGameStates = new Map();

// The leaderboard maps final number of pegs remaining with the game state for that result.
// From there you can chase up the tree via each game node's parent parameter. This map's
// format is { pegsRemaining : [gameNode1, gameNode2, ...] } where gameNodes are other
// branches of the tree that have the same number of remaining pegs. Solutions, you might say.
var mLeaderboard = new Map();

var mSolveDepth = 0;
var mGamePieces = [];
var mScore;
var mGameBoardSize = {width:800, height:600};
var mCurrentBoard;
var mStartingGameNode = GameNode();
var mGameState = kIdleState;
var mFromPegIdx = -1;

/*******************************************************************************

*******************************************************************************/	
var mGameArea = {
    canvas : mCanvas,
    start : function() {
		this.canvas.width = mGameBoardSize.width;
		this.canvas.height = mGameBoardSize.height;
		this.context = this.canvas.getContext("2d");
		this.frameNo = 0;
		this.interval = setInterval(updateGameArea, 20);
	},
	
    clear : function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

initialize();

/*******************************************************************************

*******************************************************************************/	
function initFromToMap()
{
	mFromToMap.set('0,5', 2);
	mFromToMap.set('0,3', 1);
	mFromToMap.set('1,6', 3);
	mFromToMap.set('1,8', 4);
	mFromToMap.set('2,7', 4);
	mFromToMap.set('2,9', 5);
	mFromToMap.set('3,12', 7);
	mFromToMap.set('3,10', 6);
	mFromToMap.set('3,5', 4);
	mFromToMap.set('3,0', 1);
	mFromToMap.set('4,13', 8);
	mFromToMap.set('4,11', 7);
	mFromToMap.set('5,12', 8);
	mFromToMap.set('5,3', 4);
	mFromToMap.set('5,14', 9);
	mFromToMap.set('5,0', 2);
	mFromToMap.set('6,8', 7);
	mFromToMap.set('6,1', 3);
	mFromToMap.set('7,9', 8);
	mFromToMap.set('7,2', 4);
	mFromToMap.set('8,6', 7);
	mFromToMap.set('8,1', 4);
	mFromToMap.set('9,7', 8);
	mFromToMap.set('9,2', 5);
	mFromToMap.set('10,12', 11); 
	mFromToMap.set('10,3', 6);
	mFromToMap.set('11,4', 7);
	mFromToMap.set('11,13', 12);
	mFromToMap.set('12,5', 8);
	mFromToMap.set('12,3', 7);
	mFromToMap.set('12,14', 13);
	mFromToMap.set('12,10', 11);
	mFromToMap.set('13,11', 12);
	mFromToMap.set('13,4', 8);
	mFromToMap.set('14,5', 9);
	mFromToMap.set('14,12', 13);
}

/*******************************************************************************

*******************************************************************************/	
function initialize()
{
// 	clearLog();
// 	logTrace("Peggy 1.0.\n\n");
// 	logTrace("Welcome to Peggy, the peg game solver.\n");
// 	logTrace("\n");
// 	logTrace("\n");
// 	logTrace("Pegs jump one another if a hole\n");
// 	logTrace("is next to the jumped peg.\n\n");
// 	logTrace("Here's a game board with\n");
// 	logTrace("the starting hole at position 7:\n");
// 	logTrace("\n");
// 	logPegBoard(PegBoard(7));
// 	logTrace("Run Peggy to solve this game board.\n");

	initFromToMap();
	startGame();
}

/*******************************************************************************

*******************************************************************************/	
function startGame()
{
	const kPegMargin = 130;
	const kNumRows = 5;
	const kPegSize = 30;

	var x, y, pegIdx = 0;
	var pegsInRow = 0;
	var centerX = mGameBoardSize.width / 2;

	mCurrentBoard = PegBoard(kStartingPegHole);

	for (row=0; row < kNumRows; row++)
	{
		pegsInRow = row+1;
		y = (2 * row + 1) * mGameBoardSize.height / (2*kNumRows) - 0.5*kPegSize;
		x = centerX - row * 0.5 * kPegMargin - 0.5*kPegSize;
		for (peg=0; peg < pegsInRow; peg++)
		{
			mGamePieces[pegIdx] = new component(30, kPegSize, "red", x, y);			
			pegIdx++;
			x += kPegMargin;
		}
	}

	mStartingGameNode.pegBoard = PegBoard(kStartingPegHole);
	solve(mStartingGameNode);
	
	// At this point the game has been "solved" meaning it's possible to say things
	// about a given peg board.
	
    mGameArea.start();
}

/*******************************************************************************

*******************************************************************************/	
function advanceGame(inLatestPegHit)
{
	var bDone = false;
	
	while (!bDone)
	{
		switch (mGameState)
		{
			case kIdleState:
			{
				if (mCurrentBoard[inLatestPegHit] == PEG)
				{
					mGameState = kClickFromState;
					mFromPegIdx = inLatestPegHit;
				}
				
				bDone = true;
				break;
			}
			
			case kClickFromState:
			{
				if (mCurrentBoard[inLatestPegHit] == HOLE)
					mGameState = kClickToState;
				else
					bDone = true;		
				break;
			}
			
			case kClickToState:
			{
				var move = findMove(mFromPegIdx, inLatestPegHit);
				if (move != null)
					mCurrentBoard = applyMove(mCurrentBoard, move);
				
				mGameState = kIdleState;
				mFromPegIdx = -1;
				bDone = true;
				break;
			}
		}
	}	
}

/*******************************************************************************

*******************************************************************************/	
function component(width, height, color, x, y, type) {
    this.type = type;
    this.score = 0;
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;    
    this.x = x;
    this.y = y;
    this.gravity = 0.05;
    this.gravitySpeed = 0;
    this.color = color;
    this.update = function() {
        ctx = mGameArea.context;
        if (this.type == "text") {
            ctx.font = this.width + " " + this.height;
            ctx.fillStyle = this.color;
            ctx.fillText(this.text, this.x, this.y);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    this.newPos = function() {
        this.gravitySpeed += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY + this.gravitySpeed;
        this.hitBottom();
    }
    this.hitBottom = function() {
        var rockbottom = mGameArea.canvas.height - this.height;
        if (this.y > rockbottom) {
            this.y = rockbottom;
            this.gravitySpeed = 0;
        }
    }
    this.crashWith = function(otherobj) {
        var myleft = this.x;
        var myright = this.x + (this.width);
        var mytop = this.y;
        var mybottom = this.y + (this.height);
        var otherleft = otherobj.x;
        var otherright = otherobj.x + (otherobj.width);
        var othertop = otherobj.y;
        var otherbottom = otherobj.y + (otherobj.height);
        var crash = true;
        if ((mybottom < othertop) || (mytop > otherbottom) || (myright < otherleft) || (myleft > otherright)) {
            crash = false;
        }
        return crash;
    }
    this.isHit = function(inX, inY) {
    	var outHit = false;
    	var canvasX, canvasY;
    	canvasX = inX - kBorderWidth;
    	canvasY = inY - kBorderWidth;
    	if (canvasX >= this.x && canvasX < (this.x+this.width))
    	{
    		if (canvasY >= this.y && canvasY < (this.y+this.height))
    		{
    			outHit = true;
    		}
    	}
    		
    	return outHit;
    }
}

/*******************************************************************************

*******************************************************************************/	
function updateGameArea() {
    var x, height, gap, minHeight, maxHeight, minGap, maxGap;

    mGameArea.clear();
    mGameArea.frameNo += 1;

	for (i=0; i<mGamePieces.length; i++)
	{
		var color;
		if (mCurrentBoard[i] == PEG)
		{
			if (mFromPegIdx == i)
				color = "lightgreen";
			else
				color = "green";
		}
		else
			color = "rgba(255, 255, 255, 0.05)";
			
		mGamePieces[i].color = color;
		mGamePieces[i].update();
	}
}

/*******************************************************************************

*******************************************************************************/	
function everyinterval(n) {
    if ((mGameArea.frameNo / n) % 1 == 0) {return true;}
    return false;
}

/*******************************************************************************

*******************************************************************************/	
function canvasHitTest(xPos, yPos)
{
	var outIndex = -1;

	for (i=0; i<mGamePieces.length; i++)
	{
		if (mGamePieces[i].isHit(xPos, yPos))
		{
			outIndex = i;
			break;
		}
	}

	return outIndex;
}

/*******************************************************************************

*******************************************************************************/	
function logTrace(inString)
{
	const kMaxLines = 20;
	var lines = mLog.value.split(/\n/).length;
	
	mLog.value += inString;

	if (mLog.rows < lines && lines <= kMaxLines)
		mLog.rows = lines;
}

/*******************************************************************************
   $("#exampleWindow").on("popupbeforeposition", function(evt, ui){

        $(this).find("textarea").scrollTop(0);

    });
*******************************************************************************/	
function clearLog()
{
	//mLog.focus();
	mLog.scrollTop = 0;
	mLog.value = "";
	mLog.rows = 1;
	mLog.selectionStart = 0;
	mLog.selectionEnd = 0;

}

/*******************************************************************************

*******************************************************************************/	
function logPegBoard(inPB)
{
	logTrace("                   "+inPB[0]+"\n");
	logTrace("                 "+inPB[1]+"   "+inPB[2]+"\n");
	logTrace("               "+inPB[3]+"   "+inPB[4]+"   "+inPB[5]+"\n");
	logTrace("             "+inPB[6]+"   "+inPB[7]+"   "+inPB[8]+"   "+inPB[9]+"\n");
	logTrace("           "+inPB[10]+"   "+inPB[11]+"   "+inPB[12]+"   "+inPB[13]+"   "+inPB[14]+"\n");
	logTrace("\n");
}

/*******************************************************************************

*******************************************************************************/	
function PegBoard(inStartingHole)
{
	// A peg board is an array peg locations. At each location is either a HOLE or
	// PEG. Peg boards start "full" of pegs with just one hole, the starting hole.
	
	outPegBoard = ""; // start with an empty array
	for (i=0; i < kPegHoleCount; i++)
	{
		// depending on the index, insert a HOLE or PEG
		if (i==inStartingHole)
			outPegBoard += HOLE;
		else
			outPegBoard += PEG;
	}
	
	return outPegBoard;
}

/*******************************************************************************

*******************************************************************************/	
function GameNode()
{
	var outNode = {};
	outNode.pegBoard = null;
	outNode.move = null;
	outNode.parent = null;
	outNode.children = [];
	return outNode;
}

/*******************************************************************************

*******************************************************************************/	
function pegCount(inPegBoard)
{
	var numPegs = 0;
	
	for (i=0; i < kPegHoleCount; i++)
	{
		if (inPegBoard[i] == PEG)
			numPegs += 1;
	}

	return numPegs;
}

/*******************************************************************************

*******************************************************************************/	
function updateLeaderboard(inGameNode)
{
	var score = pegCount(inGameNode.pegBoard);
	
	var nodes = mLeaderboard.get(score);
	if (nodes == undefined)
	{
		// First node to have this score, add to the map
		mLeaderboard.set(score, [inGameNode]);
	}
	else
	{
		if (!nodes.includes(inGameNode))
			nodes.push(inGameNode);
	}
}

/*******************************************************************************

*******************************************************************************/	
function dumpLeaderboard()
{
	for (score=0; score < kPegHoleCount; score++)
	{
		var scoreGroup = mLeaderboard.get(score);
		if (scoreGroup != undefined)
		{
			logTrace(scoreGroup.length+" solutions have "+score+" pegs remaining\n");
			if (scoreGroup.length == 1)
			{
				for (nodeIdx = 0; nodeIdx < scoreGroup.length; nodeIdx++)
				{
					logTrace("\n");
					logTrace("   Solution "+(nodeIdx+1)+"\n");
					
					var playback = [];
					var node = scoreGroup[nodeIdx];
					while (node != null)
					{
						playback.unshift(node);
						node = node.parent;	
					}
				
					for (i=0;i<playback.length; i++)
						logPegBoard(playback[i].pegBoard);
				}
			}
		}
	}
}

/*******************************************************************************

*******************************************************************************/	
function findMove(inFromIdx, inToIdx)
{
	var m = inFromIdx + "," + inToIdx;
	var ov = mFromToMap.get(m);
	if (typeof ov != 'undefined')
		return {from:inFromIdx, over:ov, to:inToIdx};
	else
		return null;
}

/*******************************************************************************

*******************************************************************************/	
function applyMove(inPegBoard, inMove)
{
	var outVal = inPegBoard;
	
	outVal = outVal.substring(0, inMove.from) + HOLE + outVal.substring(inMove.from+1);
	outVal = outVal.substring(0, inMove.over) + HOLE + outVal.substring(inMove.over+1);
	outVal = outVal.substring(0, inMove.to) + PEG + outVal.substring(inMove.to+1);

	return outVal;
}

/*******************************************************************************

*******************************************************************************/	
function isValidMove(inPegBoard, inMove)
{
	return (inPegBoard[inMove.from] == PEG && inPegBoard[inMove.over] == PEG && inPegBoard[inMove.to] == HOLE);
}

/*******************************************************************************

*******************************************************************************/	
function solve(inGameNode)
{
	mSolveDepth += 1;

	var foundValidMove = false;	
	for (var i = 0; i < kPegHoleCount; i++)
	{
		// Look for holes. For each hole see if  there are moves available
		if (inGameNode.pegBoard[i] == HOLE)
		{
			for (var j=0; j<mJumpMap[i].length; j++)
			{
				var move = mJumpMap[i][j];
				if (inGameNode.pegBoard[move.from] == PEG && inGameNode.pegBoard[move.over] == PEG && inGameNode.pegBoard[move.to] == HOLE)
				{
					foundValidMove = true;
					
					// Found a valid move. Update the peg board and set up a new game state
					var nextBoard = applyMove(inGameNode.pegBoard.slice(0), move); 	// slice makes a copy of the string				
					var nextNode = mKnownGameStates.get(nextBoard);
					if (nextNode!=undefined)
					{
						// This board has already been traversed, just update the current
						// game node and bail. DO NOT continue to solve!
						inGameNode.children.push(nextNode);
					}
					else
					{
						// We have NOT seen this board yet. Add it to the map and continue to solve.
						nextNode 			= GameNode();
						nextNode.pegBoard	= nextBoard;
						nextNode.move		= move;
						nextNode.parent 	= inGameNode;
						mKnownGameStates.set(nextNode.pegBoard, nextNode);
						
						inGameNode.children.push(nextNode);
						solve(nextNode);	// down the rabbit hole!
					}					
				}
			}
		}
	}

	if (!foundValidMove)
	{
		// Congratulations! At this point there are no more moves for this
		// peg board. This branch of the tree is done, put it on the leaderboard!
		updateLeaderboard(inGameNode);
	}
	
	mSolveDepth -= 1;
}

/*******************************************************************************

*******************************************************************************/	
$('.play-button').mousedown(function playButtonMouseDown()
{
	accelerate(-0.2);
});

/*******************************************************************************

*******************************************************************************/	
$('.play-button').mouseup(function playButtonMouseUp()
{
	accelerate(0.05);
});

/*******************************************************************************

*******************************************************************************	
$('.play-button').click(function()
{
	clearLog();
	logTrace("Peggy see's the game board as a number from 0 to 14:\n");
	logTrace("\n");
	logTrace("             0      \n");
	logTrace("            1 2     \n");
	logTrace("          3  4  5   \n");
	logTrace("        6  7  8  9  \n");
	logTrace("      10 11 12 13 14\n");
	logTrace("\n");
		
	var startingGameNode = GameNode();
	startingGameNode.pegBoard = PegBoard(kStartingPegHole);
	
	logTrace("Starting a game with hole at position "+kStartingPegHole+"\n");
	logTrace("Pegs are shown by '"+PEG+"' Holes are shown by '"+HOLE+"'\n");
		
	solve(startingGameNode);
	
	logTrace("\n\n");
	dumpLeaderboard();

	mLog.selectionStart = 0;	
	mLog.selectionEnd = 0;	
});

/*******************************************************************************

*******************************************************************************/
$('#game-board').click(function gameBoardClick(e)
{
    var rect = mCanvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
	var pegIdx = canvasHitTest(x, y);
	if (pegIdx != -1)
	{
		advanceGame(pegIdx);
	}
});

/*******************************************************************************

*******************************************************************************/	

}(jQuery));

/*******************************************************************************

*******************************************************************************/	
/*******************************************************************************

*******************************************************************************/	
/*******************************************************************************

*******************************************************************************/	
/*******************************************************************************

*******************************************************************************/	
/*******************************************************************************

*******************************************************************************/	
