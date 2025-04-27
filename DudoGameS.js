'use strict';

import { DudoBid } from './DudoBidS.js';

// connectionStatus codes
// &&& these are more like player status codes
const CONNECTION_UNUSED = 0;
const CONNECTION_PLAYER_IN = 1;
const CONNECTION_PLAYER_OUT = 2;
const CONNECTION_OBSERVER = 0;

export class DudoGame {

    maxConnections;
    allConnectionID = [];
    allConnectionStatus = [];
        
    // game parameters
    maxSticks;
    bPasoAllowed;
    bPaloFijoAllowed;
    bPaloFijoRound;
    
    numPlayers;
    maxPlayers;
    allParticipantNames = [];
    allSticks = [];
    allPasoUsed = [];
    
    numBids;
    maxBids;

/*
    these java definitions are now defined in the construtor
    DudoBid allBids = []; // defined in the constructor

    dice = [][];                
    diceHidden = [][];      
*/
    firstRound;
    whichDirection;          // 0 = left (clockwise); 1 = right (counter-clockwise)
    bRoundInProgress;

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
        this.numPlayers = 0;
        this.maxPlayers = 6;
        this.allSticks = [];
        for (let cc = 0; cc < this.maxConnections; cc++) {
            this.allSticks[cc] = 0;
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

        this.dice = new Array(6);
        for (let i = 0; i < 6; i++) {
            this.dice[i] = new Array(5);
        }
        this.bDiceHidden = new Array(6);
        for (let i = 0; i < 6; i++) {
            this.bDiceHidden[i] = new Array(5);
        }

        this.bRoundInProgress = false;
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
        for (let i=0; i<state.maxConnections; i++) {
            this.allConnectionStatus[i] = state.allConnectionStatus[i];
            this.allConnectionID[i] = state.allConnectionID[i];
        }
        this.bPasoAllowed = state.bPasoAllowed;
        this.bPaloFijoAllowed = state.bPaloFijoAllowed;
        this.bPaloFijoRound = state.bPaloFijoRound;

        this.maxPlayers = state.maxPlayers;
        this.numPlayers = state.numPlayers;

        this.allParticipantNames.length = 0;
        for (let i=0; i<state.maxPlayers; i++) {
            this.allParticipantNames[i] = state.allParticipantNames[i];
            this.allPasoUsed[i] = state.allPasoUsed[i];
        }

        this.numBids = state.numBids;
        this.maxBids = state.maxBids;
        this.allBids.length = 0;
        for (let i=0; i<state.numBids; i++) {
            this.allBids[i] = state.allBids[i];
        }

        this.maxSticks = state.maxSticks;
        this.allSticks.length = 0;
        for (let i=0; i<state.allSticks.length; i++) {
            this.allSticks[i] = state.allSticks[i];
        }

        this.firstRound = state.firstRound;
        this.whichDirection = state.whichDirection;
        this.bRoundInProgress = state.bRoundInProgress;
        this.goesFirst = state.goesFirst;
        this.whosTurn = state.whosTurn;
        this.whosTurnPrev = state.whosTurnPrev;
        this.whosTurnNext = state.whosTurnNext;
        
        for (let i=0; i<state.maxPlayers; i++) {
            for (let j=0; j<5; j++) {
                this.dice[i][j] = state.dice[i][j];
                this.bDiceHidden[i][j] = state.bDiceHidden[i][j];
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
        this.result.doubtLoser = state.result.doubtLoser;
        this.result.doubtWinner = state.result.doubtWinner;
        this.result.doubtCount = state.result.doubtCount;
        this.result.doubtLoserOut = state.result.doubtLoserOut;
        this.result.doubtWasPaso = state.result.doubtWasPaso;
        this.result.doubtPasoWasThere = state.result.doubtPasoWasThere;
    }

    //************************************************************
    // initialize game parameters
    //************************************************************
    initGameParms (sticks) {
        this.maxSticks = sticks;
    }

    //************************************************************
    // figure out who goes next
    //************************************************************
    getWhosTurnNext () {
        if (this.whichDirection == 0) {
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
            } else if (cc == this.maxPlayers - 1) {
                cc = 0;
            } else {
                cc = cc + 1;
            }                
            if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
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
                cc = this.maxPlayers - 1;
            } else if (cc == this.maxPlayers - 1) {
                cc = cc - 1;
            } else {
                cc = cc - 1;
            }                
            if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
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
            if (this.allSticks[this.result.doubtLoser] == this.maxSticks - 1) {
                this.result.doubtLoserOut = true;
            } else {
                this.result.doubtLoserOut = false;
            }
                
            return;
        }

        //------------------------------------------------------------
        // doubted npon-paso bid
        //------------------------------------------------------------
        this.result.doubtHowMany = this.allBids[this.numBids - 2].howMany;
        this.result.doubtOfWhat = this.allBids[this.numBids - 2].ofWhat;
        if (this.bPaloFijoRound) {
            //--------------------------------------------------------
            // palo fijo, aces are not wild
            //--------------------------------------------------------
            this.result.doubtWasPaso = false;
            this.result.doubtCount = 0;
            for (let cc = 0; cc < this.maxPlayers; cc++) {
                if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                    for (let j = 0; j < 5; j++) {
                        if (this.dice[cc][j] == this.result.doubtOfWhat) {
                            this.result.doubtCount++;
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
                for (let cc = 0; cc < this.maxPlayers; cc++) {
                    if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                        for (let j = 0; j < 5; j++) {
                            if (this.dice[cc][j] == this.result.doubtOfWhat) {
                                this.result.doubtCount++;
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
                for (let cc = 0; cc < this.maxPlayers; cc++) {
                    if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                        for (let j = 0; j < 5; j++) {
                            if ((this.dice[cc][j] == this.result.doubtOfWhat)|| this.dice[cc][j] == 1){
                                this.result.doubtCount ++;
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
                            this.numpossibleBids++;
                        }
                        // then put aces after
                        this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString() + " - ";
                        this.possibleBids[this.numPossibleBids] += "aces";
                        this.numpossibleBids++;
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

/*                
                // next level bids (double + 1)
                for (let i = 0; i < (5 * GetNumberPlayersStillIn()) - ( 2 * this.parsedHowMany); i++) {
                    for (let j = 0; j < 6; j++) {
                        possibleBids[numPossibleBids] = Integer.toString(2 * this.parsedHowMany + 1 + i)+ " - ";
                        if (j == 0) {
                            possibleBids[numPossibleBids] += "aces";
                        } else {
                            possibleBids[numPossibleBids] += Integer.toString(j + 1);
                        }
                        numPossibleBids++;
                    }
                }
*/
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
    // Populate possible bid with PASO and DUDO
    //****************************************************************
    PopulateBidListPasoDudo () {

        // is PASO a valid bid?
        var bPasoValidBid;
        if (this.bPasoAllowed) {
            if (this.bPaloFijoRound) {
                if (this.IsPaloFijo(this.whosTurn)) {
                    bPasoValidBid = true;
                } else {
                    bPasoValidBid = false;
                }
            } else {
                bPasoValidBid = true;
            }
        } else {
            bPasoValidBid = false;
        }
        // overridding everything is, no paso on first bid
        if (this.numBids == 0) {
            bPasoValidBid = false;
        }
        // can't paso twice in the same wound
        if (this.allPasoUsed[this.whosTurn]) {
            bPasoValidBid = false;
        }

        // if paso is valid, put it at the beginning of the array
        if (bPasoValidBid) {
            //this.possibleBids.unshift("PASO");
            this.possibleBids.push("PASO");
        }

        // add DOUBT
        if (this.numBids > 0) {
            this.possibleBids.push("DOUBT")
        }

        // get final array length
        this.numPossibleBids = this.possibleBids.length;

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
    // Get total number of players (in or out)
    //****************************************************************
    GetNumberPlayers () {
        let result = 0;
        for (let cc = 0; cc < this.maxConnections; cc++) {
            if (this.allConnectionStatus[cc] != CONNECTION_UNUSED) {
                result++;
            }
        }
        return result;
    }

    //****************************************************************
    // Get number of players still in
    //****************************************************************
    GetNumberPlayersStillIn () {
        let result = 0;
        for (let cc = 0; cc < this.maxConnections; cc++) {
            if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                result++;
            }
        }
        return result;
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
}

class DoubtResult {
    doubtedText;
    whoDoubted;              
    whoGotDoubted;           
    doubtHowMany;
    doubtOfWhat;
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
        let doubtLoser = undefined;
        let doubtWinner = undefined;
        let doubtCount = undefined;
        let doubtLoserOut = undefined;
        let doubtWasPaso = undefined;
        let doubtPasoWasThere = undefined;
    }
}

export { CONNECTION_UNUSED, CONNECTION_PLAYER_IN, CONNECTION_PLAYER_OUT, CONNECTION_OBSERVER };
