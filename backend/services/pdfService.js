const PDFDocument = require('pdfkit');

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

async function buildItineraryPdf({ itinerary, tripRequest }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const bufferPromise = streamToBuffer(doc);

  doc.fontSize(20).text('Travel Itinerary', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#333').text(`Destination: ${itinerary.destination || tripRequest.destination || 'N/A'}`);
  doc.text(`Dates: ${tripRequest.startDate || '-'} to ${tripRequest.endDate || '-'}`);
  doc.text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown();

  const days = Array.isArray(itinerary.days) ? itinerary.days : [];
  days.forEach((day, dayIndex) => {
    doc.fillColor('#0f172a').fontSize(14).text(`Day ${day.day || dayIndex + 1}: ${day.title || 'Plan'}`);
    doc.moveDown(0.3);

    (day.stops || []).forEach((stop, index) => {
      const line = `${index + 1}. ${stop.arrivalTime || '--:--'} - ${stop.departureTime || '--:--'}  ${stop.name || 'Stop'}`;
      doc.fontSize(11).fillColor('#111827').text(line);
      doc.fontSize(10).fillColor('#4b5563').text(`   ${stop.address || ''}`);
      if (stop.travelFromPrevious) {
        doc.text(`   Transit: ${stop.travelFromPrevious.mode || 'travel'} | ${stop.travelFromPrevious.distanceKm || 0} km | ${stop.travelFromPrevious.estimatedMinutes || 0} min`);
      }
      doc.moveDown(0.2);
    });

    doc.moveDown(0.5);
  });

  doc.end();
  return bufferPromise;
}

module.exports = {
  buildItineraryPdf,
};
