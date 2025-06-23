'use strict';

// connectionStatus codes
// &&& these are more like player status codes
const CONN_UNUSED = 0;
const CONN_PLAYER_IN = 1;
const CONN_PLAYER_OUT = 2;
const CONN_OBSERVER = 3;
const CONN_PLAYER_LEFT = 4;
const CONN_PLAYER_IN_DISCONN = 5;
const CONN_PLAYER_OUT_DISCONN = 6;
const CONN_OBSERVER_DISCONN = 7;

export class DudoGame {

	// associated arrays
	maxConnections;
	allConnectionID = [];
	allConnectionStatus = [];
	allParticipantNames = [];
	allSticks = [];
	allPasoUsed = [];
			
	// game parameters
	maxPlayers;
	maxSticks;
	bPasoAllowed;
	bPaloFijoAllowed;
	bPaloFijoRound;
	
	numBids;
	maxBids;

/*
	these java definitions are now defined in the construtor
	DudoBid allBids = []; // defined in the constructor

	dice = [][];                
	diceHidden = [][];      
*/
	firstRound;
	whichDirection;          // 1 = left (clockwise); 2 = right (counter-clockwise)
	bSettingGameParms;
	bGameInProgress;
	bRoundInProgress;
	bDoubtInProgress;
	bShowDoubtResult;
	bAskInOut;

	inOutMustSay = [];
	inOutDidSay = [];
    doubtMustLiftCup = [];
    doubtDidLiftCup = [];
	nextRoundMustSay = [];
	nextRoundDidSay = [];

	goesFirst;
	whosTurn;                
	whosTurnPrev;            
	whosTurnNext;            
	
	// for building possible bids list
	parsedHowMany;
	parsedOfWhat;
	possibleBids = [];
	numPossibleBids;

	result = new DoubtResult();
	bWinnerRound;

	bWinnerGame;
	whoWonGame;

	//****************************************************************
	// constructor
	//****************************************************************
	constructor() {
			this.maxPlayers = 8;
			//this.allSticks = [];
			for (let cc = 0; cc < this.maxConnections; cc++) {
					this.allParticipantNames[cc] = '';
					this.allConnectionID[cc] = '';
					this.allConnectionStatus = CONN_UNUSED;
					this.allSticks[cc] = 0;
					this.allPasoUsed[cc] = false;
			}

			// default game parameters
			this.maxSticks = 1;
			this.bPasoAllowed = true;
			this.bPaloFijoAllowed = true;
			this.bPaloFijoRound =  false;
			
			this.numBids = 0;
			this.maxBids = 100;
			this.allBids = new Array(this.maxBids);
			for (let i = 0; i < this.maxBids; i++) {
					this.allBids[i] = new DudoBid();
			}

			// NOTE:  10 literal must be the same as maxConnections
			this.dice = new Array(10);
			for (let i = 0; i < 10; i++) {
					this.dice[i] = new Array(5);
			}
			this.bDiceHidden = new Array(10);
			for (let i = 0; i < 10; i++) {
					this.bDiceHidden[i] = new Array(5);
			}

			this.bDiceHilite = new Array(10);
			for (let i = 0; i < 10; i++) {
					this.bDiceHilite[i] = new Array(5);
			}

			this.bSettingGameParms = false;
			this.bGameInProgress = false;
			this.bRoundInProgress = false;
			this.bDoubtInProgress = false;
			this.bShowDoubtResult = false;
			this.bAskInOut = false;
			this.bWinnerRound = false;
			this.bWinnerGame = false;

			this.whosTurn = -1;
	}

	//************************************************************
	// Fill up this instance of DudoGame from
	// the instance passed from the server
	//************************************************************
	AssignGameState(state) {

			console.log('DudoGameC: Entering AssignGameSate()');

			// Guard against invalid state
			if (!state || typeof state !== 'object' || Object.keys(state).length === 0) {
					console.error('AssignGameState: Received invalid or empty state:', state);
					return;
			}

			this.maxConnections = state.maxConnections;
			this.maxPlayers = state.maxPlayers;
			this.maxSticks = state.maxSticks;
			for (let i=0; i<state.maxConnections; i++) {
					this.allParticipantNames[i] = state.allParticipantNames[i];
					this.allConnectionID[i] = state.allConnectionID[i];
					this.allConnectionStatus[i] = state.allConnectionStatus[i];
					this.allSticks[i] = state.allSticks[i];
					this.allPasoUsed[i] = state.allPasoUsed[i];
			}

			this.bPasoAllowed = state.bPasoAllowed;
			this.bPaloFijoAllowed = state.bPaloFijoAllowed;
			this.bPaloFijoRound = state.bPaloFijoRound;

			this.numBids = state.numBids;
			this.maxBids = state.maxBids;
			this.allBids.length = 0;
			for (let i=0; i<state.numBids; i++) {
					this.allBids[i] = state.allBids[i];
			}

			this.firstRound = state.firstRound;
			this.whichDirection = state.whichDirection;
			this.bSettingGameParms = state.bSettingGameParms;
			this.bGameInProgress = state.bGameInProgress;
			this.bRoundInProgress = state.bRoundInProgress;
			this.bDoubtInProgress = state.bDoubtInProgress;
			this.bShowDoubtResult = state.bShowDoubtResult;
			this.bAskInOut = state.bAskInOut;
			this.goesFirst = state.goesFirst;
			this.whosTurn = state.whosTurn;
			this.whosTurnPrev = state.whosTurnPrev;
			this.whosTurnNext = state.whosTurnNext;
			
			for (let i=0; i<state.maxConnections; i++) {
					for (let j=0; j<5; j++) {
							this.dice[i][j] = state.dice[i][j];
							this.bDiceHidden[i][j] = state.bDiceHidden[i][j];
							this.bDiceHilite[i][j] = state.bDiceHilite[i][j];
					}
			}

			this.bWinnerGame = state.bWinnerGame;
			this.bWinnerRound = state.bWinnerRound;
			this.whoWonGame = state.whoWonGame;

			this.result.doubtedText = state.result.doubtedText;
			this.result.whoDoubted = state.result.whoDoubted;
			this.result.whoGotDoubted = state.result.whoGotDoubted;
			this.result.doubtHowMany = state.result.doubtHowMany;
			this.result.doubtOfWhat = state.result.doubtOfWhat;
			this.result.doubtShowing = state.result.doubtShowing;
			this.result.doubtLookingFor = state.result.doubtLookingFor;
			this.result.doubtLoser = state.result.doubtLoser;
			this.result.doubtWinner = state.result.doubtWinner;
			this.result.doubtCount = state.result.doubtCount;
			this.result.doubtLoserOut = state.result.doubtLoserOut;
			this.result.doubtWasPaso = state.result.doubtWasPaso;
			this.result.doubtPasoWasThere = state.result.doubtPasoWasThere;
			for (let i=0; i<state.maxConnections; i++) {
					this.inOutMustSay[i] = state.inOutMustSay[i];
					this.inOutDidSay[i] = state.inOutDidSay[i];
					this.doubtMustLiftCup[i] = state.doubtMustLiftCup[i]
					this.doubtDidLiftCup[i] = state.doubtDidLiftCup[i];
					this.nextRoundMustSay[i] = state.nextRoundMustSay[i];
					this.nextRoundDidSay[i] = state.nextRoundDidSay[i];
			}
	}

	//************************************************************
	// initialize game parameters
	//************************************************************
	PrepareNextGame () {
			this.bPasoAllowed = true;
			this.bPaloFijoAllowed = true;
			this.bPaloFijoRound =  false;
			this.firstRound = false;

			this.bSettingGameParms = false;
			this.bGameInProgress = false;
			this.bRoundInProgress = false;
			this.bDoubtInProgress = false;
			this.bShowDoubtResult = false;
			this.bAskInOut = false;
			this.bWinnerRound = false;
			this.bWinnerGame = false;

			this.whosTurn = -1;

			for (let i = 0; i < this.maxConnections; i++) {
					const status = this.allConnectionStatus[i];
					if (status == CONN_PLAYER_IN || status == CONN_PLAYER_OUT || status == CONN_OBSERVER) {
							this.allConnectionStatus[i] = CONN_PLAYER_IN;
					}
					this.allPasoUsed[i] = false;
					this.allSticks[i] = 0;
					}

			this.numBids = 0;
			this.maxBids = 100;
			this.allBids = new Array(this.maxBids);
			for (let i = 0; i < this.maxBids; i++) {
					this.allBids[i] = new DudoBid();
			}

			for (let i=0; i < 10; i++) {
					for (let j=0; j < 5; j++) {
							this.dice[i][j] = undefined;
							this.bDiceHidden[i][j] = true;
							this.bDiceHilite[i][j] = false;
					}
			}
			this.result.init();
	}

	//************************************************************
	// figure out who goes next
	//************************************************************
	getWhosTurnNext () {
			if (this.whichDirection == 1) {
					return this.getPlayerToLeft(this.whosTurn);
			} else {
					return this.getPlayerToRight(this.whosTurn);
			}
	}

	//************************************************************
	// get player to the left
	//************************************************************
	getPlayerToLeft (cc) {
			while (true) {
					if (cc == 0) {
							cc = cc + 1;
					} else if (cc == this.maxConnections - 1) {
							cc = 0;
					} else {
							cc = cc + 1;
					}                
					if (this.allConnectionStatus[cc] == CONN_PLAYER_IN) {
							break;
					}
			}
			return cc;
	}

	//************************************************************
	// get player to the right
	//************************************************************
	getPlayerToRight (cc) {
			while (true) {
					if (cc == 0) {
							cc = this.maxConnections - 1;
					} else if (cc == this.maxConnections - 1) {
							cc = cc - 1;
					} else {
							cc = cc - 1;
					}                
					if (this.allConnectionStatus[cc] == CONN_PLAYER_IN) {
							break;
					}
			}
			return cc;
	}

	//************************************************************
	// figure out doubt result
	//************************************************************
	getDoubtResult () {
			this.result.doubtedText = this.allBids[this.numBids - 2].text;
			this.result.whoDoubted = this.allBids[this.numBids - 1].playerIndex;
			this.result.whoGotDoubted = this.allBids[this.numBids - 2].playerIndex;
			//--------------------------------------------------------
			// doubted paso
			//--------------------------------------------------------
			if (this.allBids[this.numBids - 2].bPaso) {
					this.result.doubtWasPaso = true;
					this.result.doubtHowMany = 0;
					this.result.doubtOfWhat = 0;
					// determine winner and loser
					if (this.hasPaso()) {
							this.result.doubtLoser = this.result.whoDoubted;
							this.result.doubtWinner = this.result.whoGotDoubted;
							this.result.doubtPasoWasThere = true;
					}
					else {
							this.result.doubtLoser = this.result.whoGotDoubted;
							this.result.doubtWinner = this.result.whoDoubted;
							this.result.doubtPasoWasThere = false;
					}
					// is the loser out?
					if (this.allSticks[this.result.doubtLoser] == this.maxSticks - 1) {
							this.result.doubtLoserOut = true;
					} else {
							this.result.doubtLoserOut = false;
					}
					// did somebody win the game?
					// we won't actually assign the stick and make the player out until PostRound()
					// This is so it doesn't show in the UI prematurely
					if (this.GetNumberPlayersStillIn() == 2 && this.result.doubtLoserOut) {
							this.bWinnerGame = true;
							this.whoWonGame = this.result.doubtWinner;
					}
					return;
			}

			//------------------------------------------------------------
			// doubted non-paso bid
			//------------------------------------------------------------
			this.result.doubtHowMany = this.allBids[this.numBids - 2].howMany;
			this.result.doubtOfWhat = this.allBids[this.numBids - 2].ofWhat;
			this.result.doubtShowing = this.GetHowManyShowing(this.result.doubtOfWhat, this.bPaloFijoRound);
			this.result.doubtLookingFor = this.result.doubtHowMany - this.result.doubtShowing;
			if (this.result.doubtLookingFor < 0) {
					this.result.doubtLookingFor = 0;
				}
		
			if (this.bPaloFijoRound) {
					//--------------------------------------------------------
					// palo fijo, aces are not wild
					//--------------------------------------------------------
					this.result.doubtWasPaso = false;
					this.result.doubtCount = 0;
					for (let cc = 0; cc < this.maxConnections; cc++) {
							if (this.allConnectionStatus[cc] == CONN_PLAYER_IN) {
									for (let j = 0; j < 5; j++) {
											if (this.dice[cc][j] == this.result.doubtOfWhat) {
													this.result.doubtCount++;
													this.bDiceHilite[cc][j] = true;
											}
									}
							}
					}
					
			} else {
					//--------------------------------------------------------
					// regular round
					//--------------------------------------------------------
					if (this.result.doubtOfWhat == 1) {
							//----------------------------------------------------
							// doubted aces, or palofijo round
							// i.e. don't count aces as wildcards
							//----------------------------------------------------
							this.result.doubtWasPaso = false;
							this.result.doubtCount = 0;
							for (let cc = 0; cc < this.maxConnections; cc++) {
									if (this.allConnectionStatus[cc] == CONN_PLAYER_IN) {
											for (let j = 0; j < 5; j++) {
													if (this.dice[cc][j] == this.result.doubtOfWhat) {
															this.result.doubtCount++;
															this.bDiceHilite[cc][j] = true;
													}
											}
									}
							}
					}
					if (this.result.doubtOfWhat != 1) {
							//----------------------------------------------------
							// doubted non-aces
							//----------------------------------------------------
							this.result.doubtWasPaso = false;
							this.result.doubtCount = 0;
							for (let cc = 0; cc < this.maxConnections; cc++) {
									if (this.allConnectionStatus[cc] == CONN_PLAYER_IN) {
											for (let j = 0; j < 5; j++) {
													if ((this.dice[cc][j] == this.result.doubtOfWhat)|| this.dice[cc][j] == 1){
															this.result.doubtCount ++;
															this.bDiceHilite[cc][j] = true;
													}
											}
									}
							}
					}
			}

			//------------------------------------------------------------
			// determine winner and loser
			//------------------------------------------------------------
			if (this.result.doubtCount < this.result.doubtHowMany) {
					// the bid is not there
					this.result.doubtLoser = this.result.whoGotDoubted;
					this.result.doubtWinner = this.result.whoDoubted;
			} else {
					// the bid is there
					this.result.doubtLoser = this.result.whoDoubted;
					this.result.doubtWinner = this.result.whoGotDoubted;
			}

			//------------------------------------------------------------
			// is the loser out?
			//------------------------------------------------------------
			if (this.allSticks[this.result.doubtLoser] == this.maxSticks - 1) {
					this.result.doubtLoserOut = true;
			} else {
					this.result.doubtLoserOut = false;
			}

			//------------------------------------------------------------
			// did somebody win the game?
			// we won't actually assign the stick and make the player out until PostRound()
			// This is so it doesn't show in the UI prematurely
			//------------------------------------------------------------
			if (this.GetNumberPlayersStillIn() == 2 && this.result.doubtLoserOut) {
					this.bWinnerGame = true;
					this.whoWonGame = this.result.doubtWinner;
			}
	}

	//************************************************************
	// fill in list of who needs to lift their cup
	// this is 'true' or 'false' for each participant
	//************************************************************
	getMustLiftCupList () {
			// initialize all to false
			for (let i=0; i<this.maxConnections; i++) {
					this.doubtMustLiftCup[i] = false;
			}

			// if PASO, only the one who was doubted
			if (this.result.doubtWasPaso) {
					this.doubtMustLiftCup[this.result.whoGotDoubted] = true;
					return;
			}
			
			// not PASO, all players who are IN
			for (let i=0; i<this.maxConnections; i++) {
					if (this.allConnectionStatus[i] == CONN_PLAYER_IN) {
							this.doubtMustLiftCup[i] = true;
					}
			}
			// if UNUSED or OBSERVER, false
	}

	//************************************************************
	// fill in list of who needs to say in or out
	// this is 'true' or 'false' for each participant
	//************************************************************
	getInOutMustSay () {
			for (let i=0; i<this.maxConnections; i++) {
					let st = this.allConnectionStatus[i];
					if (st == CONN_PLAYER_IN || st == CONN_PLAYER_OUT || st == CONN_OBSERVER) {
							this.inOutMustSay[i] = true;
					} else {
							this.inOutMustSay[i] = false;
					}
			}
	}

	//************************************************************
	// fill in list of who needs to say ok for next round
	// this is 'true' or 'false' for each participant
	//************************************************************
	getNextRoundMustSay () {
			for (let i=0; i<this.maxConnections; i++) {
					let st = this.allConnectionStatus[i];
					if (st == CONN_PLAYER_IN || st == CONN_PLAYER_OUT) {
							this.nextRoundMustSay[i] = true;
					} else {
							this.nextRoundMustSay[i] = false;
					}
			}
	}

	//************************************************************
	// does the doubted player have the paso?
	//************************************************************
	hasPaso() {
			// int array of frequencies of each of the six numbers
			let freq = Array(6).fill(0);

			// populate frequences of each die
			for (let i = 0; i < 5; i++) {
					let die = this.dice[this.result.whoGotDoubted][i]; 
					freq[die - 1]++;
			}

			// all five the same?
			for (let i = 0; i < 6; i++) {
					if (freq[i] == 5) {
							return true;
					}
			}
			// all five the different?
			let bAllDifferent = true;
			for (let i = 0; i < 6; i++) {
					if (freq[i] > 1) {
							bAllDifferent = false;
							break;
					}
			}
			if (bAllDifferent) {
					return true;
			}
			// full house?
			let c2 = 0;
			let c3 = 0;
			for (let i = 0; i < 6; i++) {
					if (freq[i] == 2) {
							c2++;
					}
					if (freq[i] == 3) {
							c3++;
					}
			}
			if ((c2 == 1) && (c3 == 1)) {
					return true;
			}

			// none of the above
			return false;
	}

	//****************************************************************
	// Populate possible bid list REGULAR
	//****************************************************************
	PopulateBidListRegular() {

			console.log('DudoGameC: Entering PopulateBidListRegular()');
			
			//------------------------------------------------------------
			// initialize possible bid list
			//------------------------------------------------------------
			this.possibleBids.length = 0;
			this.numPossibleBids = 0;
			
			this.possibleBids.push("--Select--");
			this.numPossibleBids = 1;

			//------------------------------------------------------------
			// special case of first bid
			//------------------------------------------------------------
			let sTemp;
			if (this.numBids == 0) {
					for (let howMany = 0; howMany < this.GetNumberPlayersStillIn() * 5; howMany++) {
							// list non-aces first
							for (let ofWhat = 1; ofWhat < 6; ofWhat++) {
									sTemp = (howMany + 1) + " - " +  (ofWhat + 1);
									this.possibleBids.push(sTemp);
							}
							// then put aces after
							sTemp = (howMany + 1) + " - aces";
							this.possibleBids.push(sTemp);
					}
					this.numPossibleBids = this.possibleBids.length;
					return;
			}
			//------------------------------------------------------------
			// get and parse current bid
			// (parsed into parsedHowMany and parsedOfWhat)
			//------------------------------------------------------------
			if (this.allBids[this.numBids - 1].bPaso) {
					let lastNonPaso = this.FindLastNonPasoBid();
					this.parseBid(this.allBids[lastNonPaso].text);
			} else {
					this.parseBid(this.allBids[this.numBids - 1].text);
			}

			//------------------------------------------------------------
			// special case:  opening aces bid, then all PASOs
			// no double plus one, only simple top bid
			//------------------------------------------------------------
			if (this.allBids[this.numBids - 1].bPaso) {
					if (this.parsedOfWhat == 1) {
							if (this.FindLastNonPasoBid() == 0) {
									for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; i++) {
											// list non-aces first
											for (let j = 1; j < 6; j++) {
													this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
													this.possibleBids[this.numPossibleBids] += (j + 1).toString();
													this.numPossibleBids++;
											}
											// then put aces after
											this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
											this.possibleBids[this.numPossibleBids] += "aces";
											this.numPossibleBids++;
									}
									return;
							}
					}
			}

			//------------------------------------------------------------
			// generate (and count) possible bids
			//------------------------------------------------------------
			if (this.parsedOfWhat != 1) {
					//--------------------------------------------------------
					// Non-aces bid
					//--------------------------------------------------------
					// baja de aces bids
					for (let i = 0; i < Math.floor(this.parsedHowMany / 2); i++) {
							const temp = Math.floor(this.parsedHowMany / 2) + (this.parsedHowMany) % 2 + i;
							this.possibleBids[this.numPossibleBids] = temp.toString() + " - ";
							this.possibleBids[this.numPossibleBids] += "aces";
							this.numPossibleBids++;
					}
					// same level bids
					// list non-aces first
					for (let i = 0; i < 6 - this.parsedOfWhat; i++) {
							this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString() + " - ";
							this.possibleBids[this.numPossibleBids] += (this.parsedOfWhat + 1 + i).toString();
							this.numPossibleBids++;
					}
					// then put aces after
					this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString() + " - ";
					this.possibleBids[this.numPossibleBids] += "aces";
					this.numPossibleBids++;
					
					// next level bids
					for (let howMany = 0; howMany < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; howMany++) {
							// list non-aces first
							for (let j = 1; j < 6; j++) {
									this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + howMany).toString() + " - ";
									this.possibleBids[this.numPossibleBids] += (j + 1).toString();
									this.numPossibleBids++;
							}
							// then put aces after
							this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + howMany).toString() + " - ";
							this.possibleBids[this.numPossibleBids] += "aces";
							this.numPossibleBids++;
					}
			} else {
					//--------------------------------------------------------
					// aces bid
					//--------------------------------------------------------
					if (this.numBids == 1) {
							// special case, no double plus one after first bid
							for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; i++) {
									// list non-aces first
									for (let j = 1; j < 6; j++) {
											this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
											this.possibleBids[this.numPossibleBids] += (j + 1).toString();
											this.numPossibleBids++;
									}
									// then put aces after
									this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
									this.possibleBids[this.numPossibleBids] += "aces";
									this.numPossibleBids++;
							}
					} else {
							// raise aces bid
							for (let i = 0; i < this.parsedHowMany; i++) {
									let numAces = this.parsedHowMany + 1 + i;
									if (numAces > 5 * this.GetNumberPlayersStillIn()) {
											break;
									}
									this.possibleBids[this.numPossibleBids] = (numAces).toString() + " - ";
									this.possibleBids[this.numPossibleBids] += "aces";
									this.numPossibleBids++;
							}
							// next level bids (double + 1)
							for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - ( 2 * this.parsedHowMany); i++) {
									// list non-aces first
									for (let j = 1; j < 6; j++) {
											this.possibleBids[this.numPossibleBids] = (2 * this.parsedHowMany + 1 + i)+ " - ";
											this.possibleBids[this.numPossibleBids] += (j + 1);
											this.numPossibleBids++;
									}
									// then put aces after
									this.possibleBids[this.numPossibleBids] = (2 * this.parsedHowMany + 1 + i)+ " - ";
									this.possibleBids[this.numPossibleBids] += "aces";
											this.numPossibleBids++;
							}
					}
			}

			//&&& testing
			const testString1 = "1 - \u2680";
			const testString2 = "1 - \u2681";
			const testString3 = "1 - \u2682";
			const testString4 = "1 - \u2683";
			const testString5 = "1 - \u2684";
			const testString6 = "1 - \u2685";



			this.possibleBids[this.numPossibleBids] = testString1;
											this.numPossibleBids++;
			this.possibleBids[this.numPossibleBids] = testString2;
											this.numPossibleBids++;
			this.possibleBids[this.numPossibleBids] = testString3;
											this.numPossibleBids++;
			this.possibleBids[this.numPossibleBids] = testString4;
											this.numPossibleBids++;
			this.possibleBids[this.numPossibleBids] = testString5;
											this.numPossibleBids++;
			this.possibleBids[this.numPossibleBids] = testString6;
											this.numPossibleBids++;

	}

	//****************************************************************
	// Populate possible bid list PALOFIJO
	//****************************************************************
	PopulateBidListPaloFijo() {

			console.log('DudoGameC: Entering PopulateBidListPaloFijo()');
			
			//------------------------------------------------------------
			// initialize possible bid list
			//------------------------------------------------------------
			this.possibleBids.length = 0;
			this.numPossibleBids = 0;

			this.possibleBids.push("--Select--");
			this.numPossibleBids = 1;

			//------------------------------------------------------------
			// special case of first bid
			//------------------------------------------------------------
			let sTemp = 0;
			if (this.numBids == 0) {
					for (let howMany = 0; howMany < this.GetNumberPlayersStillIn() * 5; howMany++) {
							// list non-aces first
							for (let ofWhat = 1; ofWhat < 6; ofWhat++) {
									sTemp = (howMany + 1) + " - " +  (ofWhat + 1);
									this.possibleBids[howMany * 6 + ofWhat - 1] = sTemp;
							}
							// then put aces after
							sTemp = (howMany + 1) + " - aces";
							this.possibleBids[howMany * 6 + 5] = sTemp;
					}
					this.numPossibleBids = this.GetNumberPlayersStillIn() * 5 * 6 + 2;
					return;
			}
			//------------------------------------------------------------
			// get and parse current bid
			// (parsed into parsedHowMany and parsedOfWhat)
			//------------------------------------------------------------
			if (this.allBids[this.numBids - 1].bPaso) {
					let lastNonPaso = this.FindLastNonPasoBid();
					this.parseBid(this.allBids[lastNonPaso].text);
			} else {
					this.parseBid(this.allBids[this.numBids - 1].text);
			}

			//------------------------------------------------------------
			// generate (and count) possible bids
			//------------------------------------------------------------
			if (this.IsPaloFijo(this.whosTurn)) {
					//--------------------------------------------------------
					// I am PaloFijo
					// I can change the bid
					//--------------------------------------------------------

					this.numPossibleBids = 0;
					if (this.parsedOfWhat != 1) {
							//--------------------------------------------------------
							// Non-aces bid
							//--------------------------------------------------------
							// same level bids
							for (let i = 0; i < 6 - this.parsedOfWhat; i++) {
									this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString() + " - ";
									this.possibleBids[this.numPossibleBids] += (this.parsedOfWhat + 1 + i).toString();
									this.numPossibleBids++;
							}
							// put aces after the rest (aces are highest in palofijo)
							this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString() + " - ";
							this.possibleBids[this.numPossibleBids] += "aces";
							this.numPossibleBids++;

							// next level bids
							for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; i++) {
									for (let j = 1; j < 6; j++) {
											this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
											this.possibleBids[this.numPossibleBids] += (j + 1);
											this.numPossibleBids++;
									}
									// aces on top
									this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
									this.possibleBids[this.numPossibleBids] += "aces";
									this.numPossibleBids++;
							}
					} else {
							//--------------------------------------------------------
							// aces bid
							//--------------------------------------------------------
							// raise aces bid
							for (let i = 0; i < this.parsedHowMany - 1; i++) {
									this.possibleBids[this.numPossibleBids] = ((this.parsedHowMany) + 1 + i).toString() + " - ";
									this.possibleBids[this.numPossibleBids] += "aces";
									this.numPossibleBids++;
							}
							// next level bids
							for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; i++) {
									for (let j = 1; j < 6; j++) {
											this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
											this.possibleBids[this.numPossibleBids] += (j + 1);
											this.numPossibleBids++;
									}
									// aces on top
									this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
									this.possibleBids[this.numPossibleBids] += "aces";
									this.numPossibleBids++;
							}
					}
			} else {
					//--------------------------------------------------------
					// I'm not palofijo
					// I can only raise or doubt
					//--------------------------------------------------------
					this.numPossibleBids = 0;
					for (let i = this.parsedHowMany; i < this.GetNumberPlayersStillIn() * 5; i++) {
							this.possibleBids[this.numPossibleBids] = (i + 1).toString() + " - ";
							if (this.parsedOfWhat == 1) {
									this.possibleBids[this.numPossibleBids] += "aces";
							} else {
									this.possibleBids[this.numPossibleBids] += (this.parsedOfWhat).toString();
							}
							this.numPossibleBids++;
					}
			}
	}

	//****************************************************************
	// Parse the bid string into integers
	//****************************************************************
	parseBid(s) {
			const sSplit = s.split(" ");
			let len = sSplit.length;
			if (len === 3) {
					this.parsedHowMany = parseInt(sSplit[0]);  
					if (sSplit[2] === "aces") {
							this.parsedOfWhat = 1;
					} else {
							this.parsedOfWhat = parseInt(sSplit[2]);
					}
			} 
	}

	//****************************************************************
	// Find last non paso bid
	// (must be at least two bids made already)
	//****************************************************************
	FindLastNonPasoBid () {
			for (let i = this.numBids - 2; i >= 0; i--) {
					if (!this.allBids[i].bPaso) {
							return i;
					}
			}
			console.log('ERROR cannot find last non-paso bid');
			return (-1);
	}

	//****************************************************************
	// Get number of players in the lobby (and connected)
	//  IN, OUT, OBSERVER
	//****************************************************************
	GetNumberPlayersInLobby () {
			let result = 0;
			for (let cc = 0; cc < this.maxConnections; cc++) {
					if (this.allConnectionStatus[cc] == CONN_PLAYER_IN ||
							this.allConnectionStatus[cc] == CONN_PLAYER_OUT ||
							this.allConnectionStatus[cc] == CONN_OBSERVER) {
							result++;
					}
			}
			return result;
	}

	//****************************************************************
	// Get number of players playing this game
	//  IN, OUT
	//****************************************************************
	GetNumberPlayersPlaying () {
			let result = 0;
			for (let cc = 0; cc < this.maxConnections; cc++) {
					if (this.allConnectionStatus[cc] == CONN_PLAYER_IN ||
							this.allConnectionStatus[cc] == CONN_PLAYER_OUT) {
							result++;
					}
			}
			return result;
	}

	//****************************************************************
	// Get number of players still in
	//  IN
	//****************************************************************
	GetNumberPlayersStillIn () {
			let result = 0;
			for (let cc = 0; cc < this.maxConnections; cc++) {
					if (this.allConnectionStatus[cc] == CONN_PLAYER_IN) {
							result++;
					}
			}
			return result;
	}

	//****************************************************************
	// Can we PASO?
	//****************************************************************
	CanPaso () {
			// can't paso if not allowed by game setting
			if (!this.bPasoAllowed) {
					return false;
			}
			// can't paso on first bid
			if (this.numBids == 0) {
					return false;
			}
			// can't paso twice in the same wound
			if (this.allPasoUsed[this.whosTurn]) {
					return false;
			}

			if (this.bPaloFijoRound) {
					// only palofijos can paso in palofijo round
					return (this.IsPaloFijo(this.whosTurn));
			} else {
					// otherwise ok
					return (true);
			}
	}

	//****************************************************************
	// Is this player palofijo?
	//****************************************************************
	IsPaloFijo (cc) {
			if (this.allSticks[cc] == this.maxSticks - 1) {
					return true;
			} else {
					return false;
			}
	}

	//****************************************************************
	// Get how many showing
	//****************************************************************
	GetHowManyShowing (ofWhat, bPaloFijo) {
			let result = 0;
			for (let cc = 0; cc < this.maxConnections; cc++) {
					if (this.allConnectionStatus[cc] == CONN_PLAYER_IN) {
							// player is still in
							for (let i=0; i<5; i++) {
									if (this.doubtDidLiftCup[cc] || !this.bDiceHidden[cc][i]) {
											// this die is seen by all, examine it
											const die = this.dice[cc][i];
											if (bPaloFijo) {
													// if palofijo, only count ofWhat
													if (die == this.result.ofWhat) {
															result++;
													}
											} else {
													// not palofijo, count ofWhat and aces
													if (die == ofWhat || die == 1)  {
															result++;
													}
											}
									}
							}
					}
			}
			return result;
	}

	//****************************************************************
	// Get bid string
	//****************************************************************
	GetBidString (idx) {
			if ([this.numBids] < 1) {
					return '';
			}
			let bidString = this.allBids[idx].text;
			let showed = this.allBids[idx].howManyShown;
			if (showed > 0) {
					bidString += ` (showed ${showed})`;
			}
			return bidString;
	}
}

class DoubtResult {
    doubtedText;
    whoDoubted;              
    whoGotDoubted;           
    doubtHowMany;
    doubtOfWhat;
    doubtShowing;
    doubtLookingFor;
    doubtLoser;
    doubtWinner;
    doubtCount;
    doubtLoserOut;
    doubtWasPaso;
    doubtPasoWasThere;

    init() {
        let doubtedText = undefined;
        let whoDoubted = undefined;              
        let whoGotDoubted = undefined;           
        let doubtHowMany = undefined;
        let doubtOfWhat = undefined;
        let doubtShowing = undefined;
        let doubtLookingFor = undefined;
        let doubtLoser = undefined;
        let doubtWinner = undefined;
        let doubtCount = undefined;
        let doubtLoserOut = undefined;
        let doubtWasPaso = undefined;
        let doubtPasoWasThere = undefined;
    }
}

export class DudoBid {
  text;
  playerIndex;
  playerName;
  howMany;
  ofWhat;
  bPaso;
  bDudo;
  dice = [];
  bDiceHidden = [];
  bShowShake;
  howManyShown;
  bWhichShaken = [];
	showing;
	lookingFor;

  constructor() {
    this.text = "";
    this.playerIndex = 0;
    this.playerName = '';
    this.howMany = -1;
    this.ofWhat = -1;
    this.bPaso = false;
    this.bDudo = false;
    this.bShowShake = false;
    this.howManyShown = 0;
		this.showing = 0;
		this.lookingFor = 0;

    this.dice = Array(5).fill(0);
    this.bDiceHidden = Array(5).fill(false);
    this.bWhichShaken = Array(5).fill(false);
  }

  InitDudoBid() {
    this.text = "";
    this.playerIndex = 0;
    this.playerName = ''
    this.howMany = -1;
    this.ofWhat = -1;
    this.bPaso = false;
    this.bDudo = false;
    this.bShowShake = false;
    this.howManyShown = 0;
		this.showing = 0;
		this.lookingFor = 0;

    this.dice = Array(5).fill(0);
    this.bDiceHidden = Array(5).fill(false);
    this.bWhichShaken = Array(5).fill(false);
  }
}
  
export { CONN_UNUSED, CONN_PLAYER_IN, CONN_PLAYER_OUT, CONN_OBSERVER, CONN_PLAYER_LEFT,
    CONN_PLAYER_IN_DISCONN, CONN_PLAYER_OUT_DISCONN, CONN_OBSERVER_DISCONN };
