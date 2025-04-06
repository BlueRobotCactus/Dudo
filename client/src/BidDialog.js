'use strict';

import React, { useState } from 'react';

function BidDialog({ open, onClose, onSubmit, bids, defaultBid, makeBidString, yourTurnString, specialPasoString, style }) {
  const [selectedBid, setSelectedBid] = useState(defaultBid || '');

  if (!open) return null;

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
}

export default BidDialog;
