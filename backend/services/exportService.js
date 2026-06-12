/**
 * Export Service - Backend
 * Handles itinerary export to PDF, HTML, and ICS formats
 */

const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

class ExportService {
  /**
   * Export itinerary as PDF
   * @param {Object} itinerary - Itinerary document
   * @returns {Promise<Buffer>} PDF file buffer
   */
  static exportToPDF(itinerary) {
    return new Promise((resolve, reject) => {
      try {
        const chunks = [];
        const doc = new PDFDocument({ margin: 40 });
        const currency = 'INR';

        // Collect data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).font('Helvetica-Bold');
        doc.text(itinerary.title, { align: 'center' });
        doc.moveDown(0.5);

        // Destination and dates
        doc.fontSize(12).font('Helvetica');
        doc.text(`📍 ${itinerary.destination.city || itinerary.destination.name || 'Destination'}`);
        
        const startDate = new Date(itinerary.startDate).toLocaleDateString();
        const endDate = new Date(itinerary.endDate).toLocaleDateString();
        doc.text(`📅 ${startDate} - ${endDate}`);
        doc.text(`👥 ${itinerary.numberOfTravelers || 1} Traveler(s)`);
        doc.moveDown();

        // Activities by day
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('Daily Itinerary');
        doc.moveDown(0.5);

        const groupedActivities = this.groupActivitiesByDay(itinerary.activities || []);

        for (const [day, activities] of Object.entries(groupedActivities)) {
          doc.fontSize(12).font('Helvetica-Bold');
          doc.text(`Day ${day}`);
          doc.moveDown(0.3);

          doc.fontSize(10).font('Helvetica');
          activities.forEach((activity) => {
            const time = `${activity.startTime || 'TBD'} - ${activity.endTime || 'TBD'}`;
            doc.text(`${time} | ${activity.name || 'Activity'}`, { indent: 20 });
            
            if (activity.description) {
              doc.fontSize(9).text(activity.description, { indent: 30 });
              doc.moveDown(0.2);
            }
            
            const costStr = activity.estimatedCost ? ` | Cost: ${currency} ${activity.estimatedCost}` : '';
            const categoryStr = activity.category ? `Category: ${activity.category}` : '';
            doc.text(`${categoryStr}${costStr}`, { indent: 30 });
            if (Array.isArray(activity.reachOptions) && activity.reachOptions.length > 0) {
              doc.fontSize(9).text(`Reach options: ${activity.reachOptions.join(', ')}`, { indent: 30 });
            }
            doc.moveDown(0.3);
          });

          doc.moveDown(0.5);
        }

        // Budget summary
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('Budget Summary');
        doc.moveDown(0.5);

        doc.fontSize(11).font('Helvetica');
        const budget = itinerary.budget || {};
        const budgetItems = [
          { label: 'Accommodation', value: budget.accommodation || 0 },
          { label: 'Transportation', value: budget.transportation || 0 },
          { label: 'Activities', value: budget.activities || 0 },
          { label: 'Food', value: budget.food || 0 },
          { label: 'Miscellaneous', value: budget.misc || 0 },
        ];

        budgetItems.forEach((item) => {
          if (item.value > 0) {
            doc.text(`${item.label}: ${currency} ${item.value.toFixed(2)}`);
          }
        });

        doc.moveDown(0.3);
        doc.font('Helvetica-Bold');
        const totalBudget = budget.totalBudget || budgetItems.reduce((sum, item) => sum + item.value, 0);
        doc.text(`Total Budget: ${currency} ${totalBudget.toFixed(2)}`);

        doc.end();
      } catch (error) {
        console.error('PDF export error:', error);
        reject(error);
      }
    });
  }

  /**
   * Export itinerary as HTML
   * @param {Object} itinerary - Itinerary document
   * @returns {string} HTML content
   */
  static exportToHTML(itinerary) {
    try {
      const groupedActivities = this.groupActivitiesByDay(itinerary.activities);
      let totalCost = 0;

      let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${itinerary.title}</title>
          <style>
            * { margin: 0; padding: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 { font-size: 2.5em; margin-bottom: 10px; }
            .header p { font-size: 1.1em; opacity: 0.9; }
            .meta {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              padding: 30px 20px;
              background: #f8f9fa;
              border-bottom: 2px solid #e0e0e0;
            }
            .meta-item {
              text-align: center;
            }
            .meta-item .label { color: #666; font-size: 0.9em; }
            .meta-item .value { font-size: 1.5em; font-weight: bold; color: #667eea; margin-top: 5px; }
            .content { padding: 30px 20px; }
            .day-section {
              margin-bottom: 30px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              overflow: hidden;
            }
            .day-header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 20px;
              font-size: 1.3em;
              font-weight: bold;
            }
            .activities { padding: 20px; }
            .activity {
              margin-bottom: 20px;
              padding-bottom: 20px;
              border-bottom: 1px dashed #ddd;
            }
            .activity:last-child { border-bottom: none; }
            .activity-time {
              color: #667eea;
              font-weight: bold;
              font-size: 1em;
              margin-bottom: 5px;
            }
            .activity-name {
              font-size: 1.2em;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .activity-desc {
              color: #666;
              margin-bottom: 10px;
              line-height: 1.5;
            }
            .activity-meta {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              font-size: 0.9em;
            }
            .badge {
              display: inline-block;
              background: #f0f0f0;
              padding: 5px 10px;
              border-radius: 20px;
              border: 1px solid #ddd;
            }
            .budget {
              margin-top: 40px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 2px solid #667eea;
            }
            .budget-title { font-size: 1.3em; font-weight: bold; margin-bottom: 15px; }
            .budget-item {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #ddd;
            }
            .budget-item.total {
              font-weight: bold;
              font-size: 1.1em;
              border-bottom: 2px solid #667eea;
              color: #667eea;
            }
            .day-summary {
              background: #f0f0f0;
              padding: 10px 15px;
              border-radius: 5px;
              font-size: 0.9em;
              color: #666;
              margin-top: 15px;
            }
            @media print {
              body { background: white; padding: 0; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${itinerary.title}</h1>
              <p>${itinerary.destination.name} Trip</p>
            </div>
            <div class="meta">
              <div class="meta-item">
                <div class="label">Destination</div>
                <div class="value">${itinerary.destination.name}</div>
              </div>
              <div class="meta-item">
                <div class="label">Duration</div>
                <div class="value">${itinerary.numberOfDays} Days</div>
              </div>
              <div class="meta-item">
                <div class="label">Travelers</div>
                <div class="value">${itinerary.numberOfTravelers}</div>
              </div>
              <div class="meta-item">
                <div class="label">Budget</div>
                <div class="value">₹${itinerary.budget.totalBudget}</div>
              </div>
            </div>
            <div class="content">
      `;

      // Add activities by day
      for (const [day, activities] of Object.entries(groupedActivities)) {
        let dayTotal = 0;
        let dayDuration = 0;

        html += `
          <div class="day-section">
            <div class="day-header">Day ${day}</div>
            <div class="activities">
        `;

        activities
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .forEach((activity) => {
            dayTotal += activity.estimatedCost || 0;
            dayDuration += activity.duration || 0;

            html += `
              <div class="activity">
                <div class="activity-time">⏰ ${activity.startTime} - ${activity.endTime}</div>
                <div class="activity-name">${activity.name}</div>
                ${
                  activity.description
                    ? `<div class="activity-desc">${activity.description}</div>`
                    : ''
                }
                <div class="activity-meta">
                  <span class="badge">📌 ${activity.category}</span>
                  <span class="badge">⏱️ ${activity.duration} min</span>
                  <span class="badge">💵 ₹${activity.estimatedCost}</span>
                  <span class="badge">⭐ ${activity.importance}</span>
                </div>
              </div>
            `;
          });

        totalCost += dayTotal;

        html += `
              <div class="day-summary">
                👥 Total Activities: ${activities.length} | ⏱️ Total Duration: ${dayDuration} min | 💰 Day Total: ₹${dayTotal}
              </div>
            </div>
          </div>
        `;
      }

      // Add budget summary
      html += `
            <div class="budget">
              <div class="budget-title">💰 Budget Breakdown</div>
              <div class="budget-item">
                <span>Accommodation</span>
                <span>₹${(itinerary.budget.accommodation || 0).toFixed(2)}</span>
              </div>
              <div class="budget-item">
                <span>Transportation</span>
                <span>₹${(itinerary.budget.transportation || 0).toFixed(2)}</span>
              </div>
              <div class="budget-item">
                <span>Activities</span>
                <span>₹${(itinerary.budget.activities || 0).toFixed(2)}</span>
              </div>
              <div class="budget-item">
                <span>Food</span>
                <span>₹${(itinerary.budget.food || 0).toFixed(2)}</span>
              </div>
              <div class="budget-item">
                <span>Miscellaneous</span>
                <span>₹${(itinerary.budget.misc || 0).toFixed(2)}</span>
              </div>
              <div class="budget-item total">
                <span>TOTAL</span>
                <span>₹${itinerary.budget.totalBudget.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        </body>
        </html>
      `;

      return html;
    } catch (error) {
      console.error('HTML export error:', error);
      throw error;
    }
  }

  /**
   * Export itinerary as ICS (iCalendar)
   * @param {Object} itinerary - Itinerary document
   * @returns {string} ICS file content
   */
  static exportToICS(itinerary) {
    try {
      let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Travel Itinerary//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${itinerary.title}
X-WR-TIMEZONE:UTC
BEGIN:VTIMEZONE
TZID:UTC
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0000
TZOFFSETTO:+0000
TZNAME:UTC
END:STANDARD
END:VTIMEZONE
`;

      // Sort activities by start date/time
      const sortedActivities = (itinerary.activities || []).sort((a, b) => {
        const aDate = new Date(itinerary.startDate);
        aDate.setDate(aDate.getDate() + a.dayNumber - 1);
        const bDate = new Date(itinerary.startDate);
        bDate.setDate(bDate.getDate() + b.dayNumber - 1);
        return aDate - bDate || a.startTime.localeCompare(b.startTime);
      });

      sortedActivities.forEach((activity, index) => {
        // Calculate actual datetime
        const startDate = new Date(itinerary.startDate);
        startDate.setDate(startDate.getDate() + activity.dayNumber - 1);
        const [startHour, startMin] = activity.startTime.split(':');
        startDate.setHours(parseInt(startHour), parseInt(startMin), 0, 0);

        const endDate = new Date(startDate);
        const [endHour, endMin] = activity.endTime.split(':');
        endDate.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

        // Format dates for ICS
        const formatDate = (date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const uid = `${itinerary._id}-activity-${index}@travelapp.com`;

        ics += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${activity.name}
DESCRIPTION:${activity.description || activity.category}
LOCATION:${activity.location.address || activity.location.city || 'TBD'}
CATEGORIES:${activity.category.toUpperCase()}
STATUS:CONFIRMED
END:VEVENT
`;
      });

      ics += `END:VCALENDAR`;

      return ics;
    } catch (error) {
      console.error('ICS export error:', error);
      throw error;
    }
  }

  /**
   * Group activities by day
   * @private
   */
  static groupActivitiesByDay(activities) {
    const grouped = {};
    (activities || []).forEach((activity) => {
      if (!grouped[activity.dayNumber]) {
        grouped[activity.dayNumber] = [];
      }
      grouped[activity.dayNumber].push(activity);
    });
    return grouped;
  }
}

module.exports = ExportService;
