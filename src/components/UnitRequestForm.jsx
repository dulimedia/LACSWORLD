import React, { useState } from 'react';
import { X, Send, ChevronDown, ChevronRight, Check } from 'lucide-react';

const UnitRequestForm = ({ isOpen, onClose }) => {
  const [selectedUnits, setSelectedUnits] = useState(new Set());
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState(new Set());
  const [isSending, setIsSending] = useState(false);

  const units = {
    "First Street Building": {
      "Ground Floor": ["Club 76", "F-10", "F-15", "F-20", "F-25", "F-30", "F-35", "F-40", "F-50", "F-60", "F-70", "FG - Library", "FG - Restroom"],
      "First Floor": ["F-100", "F-105", "F-110 CR", "F-115", "F-140", "F-150", "F-160", "F-170", "F-175", "F-180", "F-185", "F-187", "F-190", "F1 Restrooms"],
      "Second Floor": ["F-200", "F-240", "F-250", "F-280", "F-290", "F2 Restrooms"],
      "Third Floor": ["F-300", "F-330", "F-340", "F-350", "F-360", "F-363", "F-365", "F-380", "F3 Restrooms"]
    },
    "Maryland Building": {
      "Ground Floor": ["ET Lab", "M-20", "M-40", "M-45", "M-50", "MG - Stage 7", "Studio O.M."],
      "First Floor": ["M-120", "M-130", "M-140", "M-145", "M-150", "M-160", "M-170", "M-180", "M1 Resstroom 2", "M1 Restrooms"],
      "Second Floor": ["M-210", "M-220", "M-230", "M-240", "M-250", "M-260", "M-270", "M2 Restroom"],
      "Third Floor": ["M-300", "M-320", "M-340", "M-345", "M-350", "M3 Restroom"]
    },
    "Tower Building": {
      "Units": ["T-100", "T-110", "T-200", "T-210", "T-220", "T-230", "T-300", "T-320", "T-400", "T-410", "T-420", "T-430", "T-450", "T-500", "T-530", "T-550", "T-600", "T-700", "T-800", "T-900", "T-950", "T-1000", "T-1100", "T-1200", "T-G10", "T-G20"]
    },
    "Stages": {
      "Production": ["Production Support - A", "Production Support - B", "Production Support C", "Production Support - D"],
      "Stages": ["Stage 7", "Stage 8", "Stage A", "Stage B", "Stage C", "Stage D", "Stage E", "Stage F"]
    },
    "Other": {
      "Event Space": ["Event Area 1", "Flix Cafe", "Theater"],
      "Mills": ["MILL 2", "MILL 3", "MILL 3 OFFICE", "MILL 4"],
      "Parking": ["Park", "Surface Parking", "Surface Parking 2"],
      "Shops": ["Kiosk", "Lobby - 2"]
    }
  };

  const toggleBuilding = (building) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(building)) {
      newExpanded.delete(building);
    } else {
      newExpanded.add(building);
    }
    setExpandedBuildings(newExpanded);
  };

  const toggleUnit = (unitId) => {
    const newSelected = new Set(selectedUnits);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnits(newSelected);
  };

  const toggleFloor = (building, floor) => {
    const floorUnits = units[building][floor];
    const floorId = `${building}/${floor}`;
    const allSelected = floorUnits.every(unit => selectedUnits.has(`${floorId}/${unit}`));
    
    const newSelected = new Set(selectedUnits);
    floorUnits.forEach(unit => {
      const unitId = `${floorId}/${unit}`;
      if (allSelected) {
        newSelected.delete(unitId);
      } else {
        newSelected.add(unitId);
      }
    });
    setSelectedUnits(newSelected);
  };

  const isFloorSelected = (building, floor) => {
    const floorUnits = units[building][floor];
    const floorId = `${building}/${floor}`;
    return floorUnits.every(unit => selectedUnits.has(`${floorId}/${unit}`));
  };

  const isFloorPartiallySelected = (building, floor) => {
    const floorUnits = units[building][floor];
    const floorId = `${building}/${floor}`;
    const selected = floorUnits.filter(unit => selectedUnits.has(`${floorId}/${unit}`));
    return selected.length > 0 && selected.length < floorUnits.length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUnits.size === 0) {
      alert('Please select at least one unit');
      return;
    }
    
    setIsSending(true);
    
    const selectedUnitsList = Array.from(selectedUnits).sort();
    
    // Format the email data
    const emailData = {
      to: 'owner@lacenter.com', // Replace with actual owner email
      subject: `Unit Inquiry - ${senderName}`,
      body: `
New Unit Inquiry

From: ${senderName}
Email: ${senderEmail}
Phone: ${senderPhone}

Selected Units (${selectedUnitsList.length}):
${selectedUnitsList.map(unit => `• ${unit}`).join('\n')}

Message:
${message}

---
Sent from LA Center Unit Request System
      `.trim()
    };

    // Here you would integrate with your email service
    // For now, we'll use mailto link or you can integrate with EmailJS, SendGrid, etc.
    
    try {
      // Option 1: Using mailto (opens email client)
      const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      window.open(mailtoLink, '_blank');
      
      // Option 2: If you have a backend API endpoint
      // const response = await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailData)
      // });
      
      setTimeout(() => {
        setIsSending(false);
        alert('Request sent successfully!');
        // Reset form
        setSelectedUnits(new Set());
        setMessage('');
        setSenderName('');
        setSenderEmail('');
        setSenderPhone('');
        onClose();
      }, 1000);
    } catch (error) {
      setIsSending(false);
      alert('Failed to send request. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <h2 className="text-lg sm:text-xl font-bold">Unit Request Form</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Your Name *"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Your Email *"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Unit Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Select Units</h3>
                <span className="text-sm text-gray-600">
                  {selectedUnits.size} unit{selectedUnits.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              
              <div className="border rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(units).map(([building, floors]) => (
                  <div key={building} className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() => toggleBuilding(building)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedBuildings.has(building) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium">{building}</span>
                      </div>
                    </button>
                    
                    {expandedBuildings.has(building) && (
                      <div className="px-3 pb-2">
                        {Object.entries(floors).map(([floor, floorUnits]) => (
                          <div key={floor} className="ml-4 mt-2">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                type="button"
                                onClick={() => toggleFloor(building, floor)}
                                className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                                  isFloorSelected(building, floor)
                                    ? 'bg-blue-500 border-blue-500'
                                    : isFloorPartiallySelected(building, floor)
                                    ? 'bg-blue-200 border-blue-500'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {(isFloorSelected(building, floor) || isFloorPartiallySelected(building, floor)) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </button>
                              <span className="font-medium text-sm">{floor}</span>
                            </div>
                            <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-1">
                              {floorUnits.map(unit => {
                                const unitId = `${building}/${floor}/${unit}`;
                                return (
                                  <label
                                    key={unit}
                                    className="flex items-center gap-1 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedUnits.has(unitId)}
                                      onChange={() => toggleUnit(unitId)}
                                      className="w-3 h-3"
                                    />
                                    <span>{unit}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="font-semibold text-lg">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please provide details about your inquiry..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="4"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || selectedUnits.size === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UnitRequestForm;