//************************************************************
// Convert stored UTC date/time to a JavaScript Date
//************************************************************
function utcDateTimeToLocal(date, time) {
    if (!date || !time) return null;

    const [month, day, shortYear] = date.split('/');
    const year = `20${shortYear}`;

    return new Date(
        `${year}-${month}-${day}T${time}Z`
    );
}

//************************************************************
// Format stored UTC date/time as local time
//************************************************************
export function FormatLocalTime(date, time) {
    const localDateTime = utcDateTimeToLocal(date, time);
    if (!localDateTime) return '';

    return localDateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toLowerCase();
}

//************************************************************
// Format stored UTC date/time as local date and time
//************************************************************
export function FormatLocalDateTime(date, time) {
    const localDateTime = utcDateTimeToLocal(date, time);
    if (!localDateTime) return '';

    const localDate = localDateTime.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });

    const localTime = FormatLocalTime(date, time);

    return `${localDate}, ${localTime}`;
}