// NOTE: This class is duplicated in both server and client.
// If you update it here, update the other copy too.
'use strict';
export class DudoBid {
  text;
  playerIndex;
  playerName;
  howMany;
  ofWhat;
  bPaso;
  bDudo;
  bDiceHidden = [];
  bShowShake;
  howManyShaken;
  bWhichShaken = [];

  constructor() {
    this.text = "";
    this.playerIndex = 0;
    this.playerName = '';
    this.howMany = -1;
    this.ofWhat = -1;
    this.bPaso = false;
    this.bDudo = false;
    this.bShowShake = false;
    this.howManyShaken = 0;

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
    this.howManyShaken = 0;
    
    this.bDiceHidden = Array(5).fill(false);
    this.bWhichShaken = Array(5).fill(false);
  }
}
  