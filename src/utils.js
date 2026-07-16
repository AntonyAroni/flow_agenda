import * as chrono from 'chrono-node';

export const parseEvent = (rawText) => {
  let isImportant = false;
  let text = rawText;

  // Detección de importancia
  if (/(?:^|\s)(!|#importante|#urgente)(?:\s|$)/i.test(text)) {
    isImportant = true;
    text = text.replace(/(?:^|\s)(!|#importante|#urgente)(?:\s|$)/ig, ' ').trim();
  }

  // Detección de etiquetas genéricas
  const tagMatches = text.match(/#[\w]+/g) || [];
  const tags = tagMatches.map(t => t.toLowerCase());
  tagMatches.forEach(tag => {
    text = text.replace(tag, '');
  });
  text = text.trim();

  // Pre-procesamiento para ayudar a Chrono con intervalos en español ("de 4 a 6 pm")
  let textForNlp = text.replace(/\bdel\b/gi, 'el');
  textForNlp = textForNlp.replace(/\bde\s+(\d{1,2}(?::\d{2})?(?:\s*am|\s*pm)?)\s+a\s+(\d{1,2}(?::\d{2})?(?:\s*am|\s*pm)?)\b/gi, 'desde las $1 hasta las $2');

  const results = chrono.es.parse(textForNlp, new Date(), { forwardDate: true });
  
  if (results && results.length > 0) {
    let eventDate = results[0].start.date();
    let hasTime = results[0].start.isCertain('hour');
    let hasEndTime = false;
    let endTimestamp = null;
    let endTimeText = '';

    // Si Chrono extrajo múltiples piezas (ej. la fecha por un lado y la hora por otro), las consolidamos
    if (results.length > 1) {
      for (let i = 1; i < results.length; i++) {
        if (!hasTime && results[i].start.isCertain('hour')) {
          eventDate.setHours(results[i].start.date().getHours(), results[i].start.date().getMinutes());
          hasTime = true;
        } else if (hasTime && !endTimestamp && results[i].start.isCertain('hour')) {
          const endDate = new Date(eventDate);
          endDate.setHours(results[i].start.date().getHours(), results[i].start.date().getMinutes());
          endTimestamp = endDate.getTime();
          hasEndTime = true;
          break;
        }
      }
    } else if (results[0].end) {
        // Si lo detectó como un solo rango nativamente
        endTimestamp = results[0].end.date().getTime();
        hasEndTime = results[0].end.isCertain('hour');
    }

    // Limpiar TODO el texto extraído por la IA del título
    let title = textForNlp;
    results.forEach(r => {
      // Usamos textForNlp para saber qué encontró, y ahora title es textForNlp
      title = title.replace(r.text, '');
      // Fallback: quitar también la versión "desde las... hasta las" si se inyectó
      title = title.replace(new RegExp('desde las ' + r.text, 'i'), '');
      title = title.replace(new RegExp('hasta las ' + r.text, 'i'), '');
    });
    
    // Limpiezas agresivas
    title = title.replace(/:\d{2}\s*(hrs|horas|am|pm|a\.m\.|p\.m\.)?/ig, '');
    title = title.replace(/\b(hrs|horas|am|pm)\b/ig, '');
    title = title.replace(/[.,;:\s]+$/, '');
    
    // Conectores sobrantes al inicio y fin
    title = title.replace(/^(?:(?:a las|a la|para las|para el|el|al|del|a|para|el d[ií]a de|el d[ií]a|en|en el|la|las|de|desde|hasta)\s+)+/i, '');
    title = title.replace(/(?:\s+(?:a las|a la|para las|para el|el|al|del|a|para|el d[ií]a de|el d[ií]a|en|en el|la|las|de|desde|hasta))+$/i, '');
    
    title = title.replace(/[.,;:\s]+$/, '');
    title = title.trim();
    
    const formatter = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
    const timeText = hasTime ? formatter.format(eventDate) : '';
    if (hasEndTime && endTimestamp) {
       endTimeText = formatter.format(new Date(endTimestamp));
    }
    
    const today = new Date();
    const isToday = eventDate.getDate() === today.getDate() && eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
    
    let displayTime = '';
    if (isToday) {
      if (hasTime && endTimeText) displayTime = `Hoy, ${timeText} - ${endTimeText}`;
      else if (hasTime) displayTime = `Hoy, ${timeText}`;
      else displayTime = 'Hoy';
    } else {
      const dateText = eventDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric'});
      if (hasTime && endTimeText) displayTime = `${dateText}, ${timeText} - ${endTimeText}`;
      else if (hasTime) displayTime = `${dateText}, ${timeText}`;
      else displayTime = dateText;
    }

    return { 
        title: title || 'Evento', 
        timeText: displayTime, 
        timestamp: eventDate.getTime(),
        endTimestamp,
        isImportant,
        tags,
        originalText: rawText,
        isAllDay: !hasTime
    };
  }
  
  // Fallback si no detecta fecha/hora
  return { 
    title: text || 'Evento', 
    timeText: 'Pronto', 
    timestamp: Date.now() + 86400000, 
    isImportant,
    tags,
    originalText: rawText 
  };
}
