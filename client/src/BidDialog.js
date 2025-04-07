'use strict';

import React, { useState } from 'react';

function BidDialog({ open, onClose, onSubmit, bids, defaultBid, makeBidString, yourTurnString, specialPasoString, style }) {
  const [selectedBid, setSelectedBid] = useState(defaultBid || '');

  if (!open) return null;

  return (
    <div style={style} className="fixed inset-0 flex justify-center items-center px-4">
      <div className="bg-white p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-2 sm:mb-4">{yourTurnString}</h2>
        <p className="mb-2 sm:mb-4 text-sm sm:text-base md:text-lg">{specialPasoString}</p>
        <p className="mb-2 sm:mb-4 text-sm sm:text-base md:text-lg">{makeBidString}</p>
        <select
          value={selectedBid}
          onChange={(e) => setSelectedBid(e.target.value)}
          className="w-full p-2 sm:p-3 md:p-4 text-base sm:text-lg md:text-xl border rounded mb-4"
        >
          {bids.map((bid) => (
            <option key={bid} value={bid}>
              {bid}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2 sm:gap-4">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(selectedBid)}
            className="px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg bg-blue-500 text-white rounded"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
  
  /*
  return (
    <div style={style}>
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-2">{yourTurnString}</h2>
        <p className="mb-4">{specialPasoString}</p>
        <p className="mb-4">{makeBidString}</p>
        <select
          value={selectedBid}
          onChange={(e) => setSelectedBid(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        >
          {bids.map((bid) => (
            <option key={bid} value={bid}>
              {bid}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={() => onSubmit(selectedBid)} className="px-4 py-2 bg-blue-500 text-white rounded">OK</button>
        </div>
      </div>
    </div>
  );
*/
}

export default BidDialog;
