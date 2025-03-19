import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';

//export let fooInt = 77;
//export const fooInt = { value: 42 };

export const fooObject = {
  mynum: 0,
  mytext: ""
};


export class myClass {
  // Declare a private field (available in modern JS runtimes)
  #myPrivateInt;

    myText = "";
    myNum = 0;
    myTextArray = ["red", "green", "blue"];
    myNumArray = [100, 200, 300];

  constructor() {
    // Initialize private and public properties
    this.#myPrivateInt = 0;
    this.myText = "classy text";
    this.myNum = 732;
  }

  // Public method
  myPublicFunction() {
    // does something
  }

  // Private method (not accessible outside the class)
  #myPrivateFunction() {
    // does something
  }
}
