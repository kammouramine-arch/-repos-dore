// Sample content for the prototype. Mirrors ios/DoOnceCore SampleData.
// Photos are prototype placeholders (see assets/photos/CREDITS.md).
window.DATA = (() => {
  const P = 'assets/photos/';
  const people = {
    me:     { id: 'me',     name: 'Me',     initials: 'A',  relationship: 'You' },
    dad:    { id: 'dad',    name: 'Dad',    initials: 'D',  relationship: 'Family' },
    julien: { id: 'julien', name: 'Julien', initials: 'J',  relationship: 'Plumber', fullName: 'Julien Martin', phone: '+33 6 12 34 56 78' },
    alex:   { id: 'alex',   name: 'Alex',   initials: 'AL', relationship: 'Household' },
  };
  const spaces = {
    kitchen: { id: 'kitchen', name: 'Kitchen',      photo: P + 'coffee-kitchen.jpg' },
    utility: { id: 'utility', name: 'Utility room', photo: P + 'pipes-valves.jpg' },
    garage:  { id: 'garage',  name: 'Garage',       photo: P + 'garage.jpg' },
  };
  const objects = {
    boiler: {
      id: 'boiler', name: 'Boiler', model: 'Vaillant ecoTEC Plus', category: 'Boiler', space: 'utility',
      photo: P + 'pipes-gauges.jpg', focus: '48% 42%', lastUsed: '2 weeks ago', installed: '2024',
      serviceProvider: 'julien', lastService: '10 May 2026', lastConfirmed: '18 March 2026',
      // Object hull used by the recognition contour, in % of the camera frame.
      hull: [[27, 8], [62, 6], [70, 20], [68, 48], [60, 60], [40, 62], [26, 50], [22, 24]],
      labelAt: [46, 40],
    },
    espresso: {
      id: 'espresso', name: 'Espresso machine', model: 'La Marzocco Linea Mini', category: 'Espresso machine', space: 'kitchen',
      photo: P + 'coffee-kitchen.jpg', focus: '70% 45%', lastUsed: 'Yesterday', installed: '2023', lastConfirmed: '2 June 2026',
      hull: [[52, 28], [92, 24], [96, 46], [92, 62], [60, 64], [50, 50]], labelAt: [72, 44],
    },
    thermostat: { id: 'thermostat', name: 'Thermostat', model: 'Nest Learning Thermostat', category: 'Thermostat', space: 'kitchen', photo: P + 'thermostat.jpg', focus: '50% 50%', lastUsed: '3 weeks ago' },
    washer:     { id: 'washer',     name: 'Washing machine', model: 'Bosch Serie 6', category: 'Washing machine', space: 'utility', photo: P + 'washing.jpg', focus: '50% 60%', lastUsed: 'Last month' },
    router:     { id: 'router',     name: 'Router', model: 'TP-Link Archer', category: 'Router', space: 'kitchen', photo: P + 'router.jpg', focus: '50% 50%', lastUsed: 'August' },
    car:        { id: 'car',        name: 'Car', model: 'Porsche Panamera', category: 'Car', space: 'garage', photo: P + 'car.jpg', focus: '50% 50%', lastUsed: 'July' },
  };

  // The boiler transcript (what Julien said), with timings. Used by Teach, Processing, Review, Do and Ask.
  const boilerTranscript = [
    { t: 1.2,  text: 'Okay so, when the pressure drops below one bar the boiler will lock out.' },
    { t: 5.0,  text: 'First open the lower panel — pull it from the bottom edge, it just clips off.', key: ['pull from the bottom edge'] },
    { t: 12.4, text: 'Find the blue filling valve, it\'s the one on the left here.', key: ['blue', 'left'] },
    { t: 19.8, text: 'Important — turn it slowly. It gets stiff near the end, don\'t force it.', key: ['Important', 'slowly', 'don\'t force it'], important: true },
    { t: 27.0, text: 'Keep an eye on the gauge and stop when it reaches one and a half bar.', key: ['stop', '1.5 bar'], value: '1.5 bar' },
    { t: 34.5, text: 'Never go above two, that\'s the red zone. Close the valve fully.', key: ['Never', 'above two', 'Close the valve fully'], important: true },
    { t: 41.0, text: 'Then press reset once and it\'ll fire back up in about a minute.', key: ['reset once'] },
  ];

  const memories = [
    {
      id: 'repressurise', object: 'boiler', title: 'Repressurise boiler', taughtBy: 'julien', date: '18 March 2026', shortDate: '18 Mar',
      duration: '2 min', risk: 'medium', lastConfirmed: '18 March 2026', version: 1,
      summary: 'When pressure drops below 1 bar the boiler locks out. Refill to 1.5 bar via the blue valve, then reset.',
      tools: [], transcript: boilerTranscript,
      steps: [
        { n: 1, instruction: 'Open the lower panel.', detail: 'Pull it from the bottom edge. It clips off.', from: 5, to: 11, quote: 'Pull it from the bottom edge, it just clips off.', provenance: 'observed', photo: P + 'pipes-valves.jpg', focus: '50% 70%' },
        { n: 2, instruction: 'Find the blue filling valve.', detail: 'It’s the one on the left.', from: 12, to: 19, quote: 'Find the blue filling valve, it\'s the one on the left here.', provenance: 'observed', photo: P + 'pipes-gauges.jpg', focus: '30% 60%' },
        { n: 3, instruction: 'Turn the blue valve slowly.', detail: 'Stop when pressure reaches 1.5 bar.', from: 20, to: 33, quote: 'Turn it slowly. It gets stiff near the end, don\'t force it.', provenance: 'observed', warning: 'Never go above 2 bar.', photo: P + 'pipes-gauges.jpg', focus: '48% 42%', completion: { value: '1.5 bar' } },
        { n: 4, instruction: 'Close the valve fully.', detail: 'Check the gauge stays steady.', from: 34, to: 40, quote: 'Close the valve fully.', provenance: 'observed', photo: P + 'vintage-gauge.jpg', focus: '50% 50%' },
        { n: 5, instruction: 'Press reset once.', detail: 'It fires back up in about a minute.', from: 41, to: 48, quote: 'Press reset once and it\'ll fire back up in about a minute.', provenance: 'unclear', unclear: 'The reset button wasn’t clearly in frame.', photo: P + 'water-heater.jpg', focus: '50% 45%' },
      ],
    },
    { id: 'restart',   object: 'boiler', title: 'Restart after lockout', taughtBy: 'dad', date: '18 March 2026', shortDate: '18 Mar', duration: '40 s', risk: 'low', stepsCount: 2 },
    { id: 'shutoff',   object: 'boiler', title: 'Emergency shutoff',     taughtBy: 'julien', date: '18 March 2026', shortDate: '18 Mar', duration: '30 s', risk: 'high', stepsCount: 3 },
    { id: 'grouphead', object: 'espresso', title: 'Clean group head',    taughtBy: 'dad', date: '2 June 2026', shortDate: '2 Jun', duration: '3 min', risk: 'low', stepsCount: 6 },
    { id: 'pressure',  object: 'espresso', title: 'Adjust pressure',     taughtBy: 'dad', date: '2 June 2026', shortDate: '2 Jun', duration: '1 min', risk: 'low', stepsCount: 3 },
    { id: 'gasket',    object: 'espresso', title: 'Replace gasket',      taughtBy: 'dad', date: '2 June 2026', shortDate: '2 Jun', duration: '4 min', risk: 'low', stepsCount: 7 },
    { id: 'wand',      object: 'espresso', title: 'Steam wand cleaning', taughtBy: 'me',  date: '14 July 2026', shortDate: '14 Jul', duration: '1 min', risk: 'low', stepsCount: 3 },
    { id: 'dadsettings', object: 'espresso', title: 'Dad’s settings',    taughtBy: 'dad', date: '2 June 2026', shortDate: '2 Jun', duration: '2 min', risk: 'low', stepsCount: 4 },
    { id: 'cleanmachine', object: 'espresso', title: 'Clean espresso machine', taughtBy: 'me', date: '20 September 2026', shortDate: '20 Sep', duration: '5 min', risk: 'low', stepsCount: 7, inProgress: { done: 2, total: 7 } },
    { id: 'schedule',  object: 'thermostat', title: 'Set weekly schedule', taughtBy: 'me', date: '1 September 2026', shortDate: '1 Sep', duration: '2 min', risk: 'low', stepsCount: 4 },
    { id: 'drain',     object: 'washer', title: 'Clean drain filter',   taughtBy: 'dad', date: '8 August 2026', shortDate: '8 Aug', duration: '3 min', risk: 'low', stepsCount: 5 },
    { id: 'reset',     object: 'router', title: 'Reset router',         taughtBy: 'alex', date: '22 August 2026', shortDate: '22 Aug', duration: '1 min', risk: 'low', stepsCount: 3 },
    { id: 'tyre',      object: 'car', title: 'Check tyre pressure',     taughtBy: 'dad', date: '12 July 2026', shortDate: '12 Jul', duration: '2 min', risk: 'low', stepsCount: 4 },
  ];

  const timeline = [
    { label: 'This week', items: ['cleanmachine'] },
    { label: 'September', items: ['schedule'] },
    { label: 'August', items: ['reset', 'drain'] },
    { label: 'July', items: ['wand', 'tyre'] },
    { label: 'June', items: ['grouphead', 'pressure', 'gasket', 'dadsettings'] },
    { label: 'March', items: ['repressurise', 'restart', 'shutoff'] },
  ];

  const notifications = [
    { title: 'Your boiler memory is 12 months old.', sub: 'Julien recommended checking pressure yearly.', when: 'Today' },
    { title: 'Alex added “Reset router” to Home.', sub: 'Kitchen · 3 steps', when: 'Aug 22' },
    { title: 'Espresso machine cleaning is due.', sub: 'Every 2 weeks · Dad’s schedule', when: 'Aug 14' },
  ];

  const memoriesFor = id => memories.filter(m => m.object === id);
  const byId = id => memories.find(m => m.id === id);
  return { people, spaces, objects, memories, timeline, notifications, memoriesFor, byId, photos: P };
})();
