import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { DudoBid} from "./DudoBid.js";

// connectionStatus codes
// &&& these are more like player status codes
const CONNECTION_UNUSED = 0;
const CONNECTION_PLAYER_IN = 1;
const CONNECTION_PLAYER_OUT = 2;
const CONNECTION_OBSERVER = 0;

export class DudoGame {

    maxConnections;
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

    // results of the doubt
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

        this.whosTurn = -1;
    }

    //************************************************************
    // figure out who goes next
    //************************************************************
    getWhosTurnNext () {
        this.whosTurnPrev = this.whosTurn;
        
        if (this.whichDirection == 0) {
            this.whosTurn = this.getPlayerToLeft(this.whosTurn);
        } else {
            this.whosTurn = this.getPlayerToRight(this.whosTurn);
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
        this.whoDoubted = this.allBids[this.numBids - 1].player;
        this.whoGotDoubted = this.allBids[this.numBids - 2].player;
        //--------------------------------------------------------
        // doubted paso
        //--------------------------------------------------------
        if (this.allBids[this.numBids - 2].paso) {
            this.doubtWasPaso = true;
            this.doubtHowMany = 0;
            this.doubtOfWhat = 0;
            if (this.hasPaso()) {
                this.doubtLoser = this.whoDoubted;
                this.doubtWinner = this.whoGotDoubted;
                this.doubtPasoWasThere = true;
            }
            else {
                this.doubtLoser = this.whoGotDoubted;
                this.doubtWinner = this.whoDoubted;
                this.doubtPasoWasThere = false;
            }
            return;
        }

        //------------------------------------------------------------
        // doubted npon-paso bid
        //------------------------------------------------------------
        this.doubtHowMany = this.allBids[this.numBids - 2].howMany;
        this.doubtOfWhat = this.allBids[this.numBids - 2].ofWhat;
        if (this.bPaloFijoRound) {
            //--------------------------------------------------------
            // palo fijo, aces are not wild
            //--------------------------------------------------------
            this.doubtWasPaso = false;
            this.doubtCount = 0;
            for (let cc = 0; cc < this.maxPlayers; cc++) {
                if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                    for (let j = 0; j < 5; j++) {
                        if (this.dice[cc][j] == this.doubtOfWhat) {
                            this.doubtCount++;
                        }
                    }
                }
            }
            
        } else {
            //--------------------------------------------------------
            // regular round
            //--------------------------------------------------------
            if (this.doubtOfWhat == 1) {
                //----------------------------------------------------
                // doubted aces, or palofijo round
                // i.e. don't count aces as wildcards
                //----------------------------------------------------
                this.doubtWasPaso = false;
                this.doubtCount = 0;
                for (let cc = 0; cc < this.maxPlayers; cc++) {
                    if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                        for (let j = 0; j < 5; j++) {
                            if (this.dice[cc][j] == this.doubtOfWhat) {
                                this.doubtCount++;
                            }
                        }
                    }
                }
            }
            if (this.doubtOfWhat != 1) {
                //----------------------------------------------------
                // doubted non-aces
                //----------------------------------------------------
                this.doubtWasPaso = false;
                this.doubtCount = 0;
                for (let cc = 0; cc < this.maxPlayers; cc++) {
                    if (this.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                        for (let j = 0; j < 5; j++) {
                            if ((this.dice[cc][j] == this.doubtOfWhat)|| this.dice[cc][j] == 1){
                                this.doubtCount ++;
                            }
                        }
                    }

                }
            }
        }

        //------------------------------------------------------------
        // determine winner and loser
        //------------------------------------------------------------
        if (this.doubtCount < this.doubtHowMany) {
            // the bid is not there
            this.doubtLoser = this.whoGotDoubted;
            this.doubtWinner = this.whoDoubted;
        } else {
            // the bid is there
            this.doubtLoser = this.whoDoubted;
            this.doubtWinner = this.whoGotDoubted;
        }

        //------------------------------------------------------------
        // is the loser out?
        //------------------------------------------------------------
        if (this.allSticks[this.doubtLoser] == this.maxSticks - 1) {
            this.doubtLoserOut = true;
        } else {
            this.doubtLoserOut = false;
        }
    }

    //************************************************************
    // does the doubted player have the paso?
    //************************************************************
    hasPaso() {
        // int array of frequencies of each of the six numbers
        let freq = new Array[6];
        for (let i = 0; i < 6; i++) {
            freq[i] = 0;
        }
        // populate frequences of each die
        for (let i = 0; i < 5; i++) {
            let die = this.dice[this.whoGotDoubted][i]; 
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
        if (this.allBids[this.numBids - 1].paso) {
            let lastNonPaso = this.FindLastNonPasoBid();
            this.parseBid(this.allBids[lastNonPaso].text);
        } else {
            this.parseBid(this.allBids[this.numBids - 1].text);
        }

        //------------------------------------------------------------
        // special case:  opening aces bid, then all PASOs
        // no double plus one, only simple top
        //------------------------------------------------------------
        if (this.allBids[this.numBids - 1].paso) {
            if (this.parsedOfWhat == 1) {
                if (this.FindLastNonPasoBid() == 0) {
                    for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; i++) {
                        // list non-aces first
                        for (let j = 1; j < 6; j++) {
                            this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString+ " - ";
                            this.possibleBids[this.numPossibleBids] += (j + 1).toString;
                            this.numpossibleBids++;
                        }
                        // then put aces after
                        this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString + " - ";
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
            for (let i = 0; i < (this.parsedHowMany / 2); i++) {
                this.possibleBids[this.numPossibleBids] = ((this.parsedHowMany) / 2 + (this.parsedHowMany) % 2 + i).toString + " - ";
                this.possibleBids[this.numPossibleBids] += "aces";
                this.numPossibleBids++;
            }
            // same level bids
            // list non-aces first
            for (let i = 0; i < 6 - this.parsedOfWhat; i++) {
                this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString + " - ";
                this.possibleBids[this.numPossibleBids] += (this.parsedOfWhat + 1 + i).toString;
                this.numPossibleBids++;
            }
            // then put aces after
            this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString + " - ";
            this.possibleBids[this.numPossibleBids] += "aces";
            this.numPossibleBids++;
            
            // next level bids
            for (let howMany = 0; howMany < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; howMany++) {
                // list non-aces first
                for (let j = 1; j < 6; j++) {
                    this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + howMany).toString + " - ";
                    this.possibleBids[this.numPossibleBids] += (j + 1).toString;
                    this.numPossibleBids++;
                }
                // then put aces after
                this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + howMany).toString + " - ";
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
                        this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString + " - ";
                        this.possibleBids[this.numPossibleBids] += (j + 1).toString;
                        this.numPossibleBids++;
                    }
                    // then put aces after
                    this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString + " - ";
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
                    this.possibleBids[this.numPossibleBids] = (numAces).toString + " - ";
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
    PopulateBidListPaloFijo(bImPaloFijo) {
        //------------------------------------------------------------
        // initialize possible bid list
        //------------------------------------------------------------
        for (let i = 0; i < this.GetNumberPlayersStillIn() * 5 * 6 + 2; i++) {
            this.possibleBids[i] = "";
        }
        
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
        if (this.allBids[this.numBids - 1].paso) {
            let lastNonPaso = this.FindLastNonPasoBid();
            this.parseBid(this.allBids[lastNonPaso].text);
        } else {
            this.parseBid(this.allBids[this.numBids - 1].text);
        }

        //------------------------------------------------------------
        // generate (and count) possible bids
        //------------------------------------------------------------
        if (bImPaloFijo) {
            this.numPossibleBids = 0;
            if (this.parsedOfWhat != 1) {
                //--------------------------------------------------------
                // Non-aces bid
                //--------------------------------------------------------
                // same level bids
                for (let i = 0; i < 6 - this.parsedOfWhat; i++) {
                    this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString + " - ";
                    this.possibleBids[this.numPossibleBids] += (this.parsedOfWhat + 1 + i).toString;
                    this.numPossibleBids++;
                }
                // put aces after the rest (aces are highest in palofijo)
                this.possibleBids[this.numPossibleBids] = (this.parsedHowMany).toString + " - ";
                this.possibleBids[this.numPossibleBids] += "aces";
                this.numPossibleBids++;

                // next level bids
                for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; i++) {
                    for (let j = 1; j < 6; j++) {
                        this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString + " - ";
                        this.possibleBids[this.numPossibleBids] += (j + 1);
                        this.numPossibleBids++;
                    }
                    // aces on top
                    this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString + " - ";
                    this.possibleBids[this.numPossibleBids] += "aces";
                    this.numPossibleBids++;
                }
            } else {
                //--------------------------------------------------------
                // aces bid
                //--------------------------------------------------------
                // raise aces bid
                for (let i = 0; i < this.parsedHowMany - 1; i++) {
                    this.possibleBids[this.numPossibleBids] = ((this.parsedHowMany) + 1 + i).toString + " - ";
                    this.possibleBids[this.numPossibleBids] += "aces";
                    this.numPossibleBids++;
                }
                // next level bids
                for (let i = 0; i < (5 * this.GetNumberPlayersStillIn()) - this.parsedHowMany; i++) {
                    for (let j = 1; j < 6; j++) {
                        this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString + " - ";
                        this.possibleBids[this.numPossibleBids] += (j + 1);
                        this.numPossibleBids++;
                    }
                    // aces on top
                    this.possibleBids[this.numPossibleBids] = (this.parsedHowMany + 1 + i).toString + " - ";
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
            // I can only raise of doubt
            //--------------------------------------------------------
            this.numPossibleBids = 0;
            for (let i = this.parsedHowMany; i < this.GetNumberPlayersStillIn() * 5; i++) {
                this.possibleBids[this.numPossibleBids] = (i + 1).toString + " - ";
                if (this.parsedOfWhat == 1) {
                    this.possibleBids[this.numPossibleBids] += "aces";
                } else {
                    this.possibleBids[this.numPossibleBids] += (this.parsedOfWhat).toString;
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
        if (len == 3) {
            this.parsedHowMany = parseInt(sSplit[0]);  
            if (sSplit[2].equals("aces")) {
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
            if (!this.allBids[i].paso) {
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


class DudoBid {
    
    text;
    player;
    howMany;
    ofWhat;
    bPaso;
    bDudo;
    bDiceHidden = [];
    bShakeShow;
    howManyShaken;
    bWhichShaken = [];
  
    //****************************************************************
    // constructor
    //****************************************************************
    constructor() {
        this.text = "";
        this.player = 0;
        this.howMany = -1;
        this.OfWhat = -1;
        this.bPaso = false;
        this.bDudo = false;
        this.bShakeShow = false;
  
        this.bDiceHidden = new Array[5];
        this.bWhichShaken = new Array[5];
        for (let i=0; i < 5; i++) {
            this.bDiceHidden[i] = false;
            this.bWhichShaken[i] = false;
        }
    }
  
    //****************************************************************
    // Initialize (same as constructor)
    //****************************************************************
  
    InitDudoBid() {
        this.text = "";
        this.player = 0;
        this.howMany = -1;
        this.OfWhat = -1;
        this.bPaso = false;
        this.bDudo = false;
        this.bShakeShow = false;
  
        this.bDiceHidden = new Array[5];
        this.bWhichShaken = new Array[5];
        for (let i=0; i < 5; i++) {
            this.bDiceHidden[i] = false;
            this.bWhichShaken[i] = false;
        }
    }
}

export { CONNECTION_UNUSED, CONNECTION_PLAYER_IN, CONNECTION_PLAYER_OUT, CONNECTION_OBSERVER };
