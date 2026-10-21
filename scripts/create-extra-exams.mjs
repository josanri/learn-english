import { writeFileSync } from 'node:fs';

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const q = (id, prompt, options, answer) => ({ id, prompt, options, answer });
const questions = (prefix, rows) => rows.map(([prompt, options, answer], index) => q(`${prefix}-${index + 1}`, prompt, options, answer));
const gap = (id, answer, accepted) => ({ id, answer, ...(accepted ? { accepted } : {}) });
const clip = (id, speaker, script, prompt, options, answer) => ({ id, speaker, script, question: q(id, prompt, options, answer) });
const speaking = (paper, interview, photo, part3, discussion) => [
  { part: 1, type: 'interview', title: 'Getting to know you', instructions: 'Answer each question in your own words. Aim to speak for 20–30 seconds.', questions: interview.map((prompt, i) => ({ id: `s${paper}-1-${i + 1}`, prompt })) },
  { part: 2, type: 'photo-description', title: 'Describe a photograph', instructions: 'Look at the photograph and speak for about one minute. Describe the people, the place and what might happen next.', prompt: photo.prompt, images: [photo.image] },
  { part: 3, type: 'collaborative-task', title: part3.title, instructions: part3.instructions, prompt: part3.prompt, images: part3.images },
  { part: 4, type: 'discussion', title: part3.discussionTitle, instructions: 'Answer the questions. Support your ideas with reasons or examples.', questions: discussion.map((prompt, i) => ({ id: `s${paper}-4-${i + 1}`, prompt })) },
];

const gardenPhoto = {
  id: 's4-2-garden', scene: 'garden', title: 'A community garden', alt: 'A group of neighbours planting seeds together in an outdoor garden.',
  photoUrl: 'https://images.unsplash.com/photo-1673252849129-d0acf9452c29?auto=format&fit=crop&w=1400&q=82', photoCredit: 'Ridwan Abdurrohman', photoSource: 'https://unsplash.com/photos/a-group-of-people-working-in-a-garden-jYJBC_S_Cps',
};
const cookingPhoto = {
  id: 's5-2-cooking', scene: 'cooking', title: 'Preparing breakfast', alt: 'A couple preparing breakfast together in a bright home kitchen.',
  photoUrl: 'https://images.unsplash.com/photo-1758523417453-0536e7dc0f58?auto=format&fit=crop&w=1400&q=82', photoCredit: 'Vitaly Gariev', photoSource: 'https://unsplash.com/photos/couple-preparing-food-together-in-a-modern-kitchen-scFRXTSAWfk',
};

const exam4 = {
  id: 'exam-04', title: 'A Greener City', subtitle: 'Transport, local projects and caring for the environment', theme: 'City life & the environment',
  reading: [
    { part: 1, type: 'notices', title: 'Notices and messages', instructions: 'For each notice, choose what it means.', passage: [
      'CYCLE HIRE: Return bikes by 7 p.m. today. The riverside station will close early for repairs.',
      'GREEN CLUB: Bring a reusable cup to Thursday’s meeting. We are planning a new project for the town.',
      'JAMIE: The number 8 bus is full. I’ll get the next one, so please order without me.',
      'PARK RUN: This Sunday’s 5 km event starts at 9:30, not 9:00. Check in beside the café.',
      'ROOM TO SHARE: One room available near the station. No smoking indoors. Garden and bills included.',
    ], questions: questions('r4-1', [
      ['What must cycle-hire customers do today?', ['Return their bikes before the usual time.', 'Take the bikes to another station.', 'Pay for repairs to the riverside station.'], 0],
      ['What should Green Club members bring?', ['A plan for a town project.', 'A cup they can use again.', 'A friend who lives nearby.'], 1],
      ['What does Jamie want his friend to do?', ['Wait at the bus stop.', 'Save him a seat on the bus.', 'Start ordering food.'], 2],
      ['What has changed about the park run?', ['The place where it begins.', 'The distance participants run.', 'The time it starts.'], 2],
      ['Who would be suitable for the room?', ['A person who wants a garden and does not smoke.', 'A family looking for a house outside town.', 'Someone who needs a room without bills.'], 0],
    ]) },
    { part: 2, type: 'matching', title: 'People and local activities', instructions: 'Read what each person is looking for. Match each person to the best activity. There are three extra activities.', people: [
      { id: 'p1', text: 'Mia wants to learn to repair her bicycle. She can only come on Wednesday evenings.' }, { id: 'p2', text: 'Ben would like to help local wildlife and prefers being outdoors.' }, { id: 'p3', text: 'Rosa wants to learn about saving energy at home at the weekend.' }, { id: 'p4', text: 'Arun enjoys taking photographs and wants to explore the town on foot.' }, { id: 'p5', text: 'Ellie wants to meet people while travelling to work by bus.' },
    ], texts: [
      { id: 'A', title: 'Bike repair basics', text: 'Bring your bicycle to our workshop every Wednesday at 6 p.m. Learn to fix a puncture and check your brakes.' }, { id: 'B', title: 'River wildlife group', text: 'Join us on Saturday mornings to count birds and clean the path beside the river. Gloves are provided.' }, { id: 'C', title: 'Warm homes workshop', text: 'This Sunday, find out how insulation and simple daily habits can reduce the energy you use.' }, { id: 'D', title: 'Photo walk', text: 'Explore historic streets with a local photographer on Saturday afternoon. Bring a camera or phone.' }, { id: 'E', title: 'Bus book club', text: 'Read a short story on your journey, then meet other passengers for a friendly chat every month.' }, { id: 'F', title: 'Community choir', text: 'Sing popular songs with a relaxed group on Monday evenings. You do not need experience.' }, { id: 'G', title: 'Kayaking lessons', text: 'Learn to paddle safely on the lake during our three-day summer course.' }, { id: 'H', title: 'Weekend cooking', text: 'Prepare quick meals using vegetables grown nearby. The class takes place on Friday evenings.' },
    ], questions: ['Mia', 'Ben', 'Rosa', 'Arun', 'Ellie'].map((name, i) => q(`r4-2-${i + 1}`, name, letters, i)) },
    { part: 3, type: 'multiple-choice', title: 'A repair café in town', instructions: 'Read the article and choose the best answer for each question.', passage: 'When a toaster stopped working, I nearly put it in the bin. Then my neighbour told me about the repair café at the community centre. It opens one Saturday a month, and volunteers help visitors repair small household objects. I was unsure whether I could fix anything, but the volunteer showed me how to test the cable safely. The toaster worked again after ten minutes.\n\nThe café is not a shop, and the volunteers do not promise that every object can be repaired. People bring old lamps, toys and clothes, and they learn by watching or helping. Last month, a retired electrician taught two teenagers how to replace a plug. They came back this week with a radio they had repaired at home.\n\nMy favourite part is the friendly atmosphere. Visitors can have tea while they wait, and someone usually brings a cake. The project also has a practical benefit: fewer things are thrown away. The organisers hope to open on two Saturdays each month, but they need more volunteers before they can do that.', questions: questions('r4-3', [
      ['Why did the writer visit the repair café?', ['A neighbour asked for help.', 'The writer wanted to repair a toaster.', 'The community centre was selling kitchen equipment.'], 1], ['What did the volunteer do first?', ['Explained how to test the cable safely.', 'Replaced the toaster with another one.', 'Asked the writer to buy a new tool.'], 0], ['What happened to the two teenagers?', ['They started working as electricians.', 'They returned after repairing a radio themselves.', 'They opened a repair café at home.'], 1], ['What does the writer like about the café?', ['It sells inexpensive household objects.', 'It has a welcoming feeling.', 'It is open every weekend.'], 1], ['What do the organisers need before opening more often?', ['Find additional helpers.', 'Move to a larger building.', 'Charge visitors for repairs.'], 0],
    ]) },
    { part: 4, type: 'gapped-text', title: 'A new cycle route', instructions: 'Five sentences have been removed from the text. Choose the correct sentence for each gap. There is one extra sentence.', passage: 'Last year, the town council asked residents how to make short journeys easier. [1] Many people said they would cycle if they felt safer near the busy shopping street. [2] The council painted a cycle lane and added signs at both ends. Work began in March, just before the weather became warmer. [3] During the first week, volunteers stood nearby and explained how to use the new route. They also asked cyclists to report any problems. [4] One corner was difficult to see, so the council moved a small sign. Since then, more parents have used the route to take their children to school. [5] The council now plans to connect it to the railway station.', sentences: ['The most common suggestion was a protected route into the centre.', 'In response, they planned a route away from the main road.', 'Local cyclists were invited to test the lane when it opened.', 'This quick change made the crossing clearer.', 'The council is also offering free bicycle lessons next month.', 'That feedback helped the council make a small improvement.'], gaps: [gap('r4-4-1', 'A'), gap('r4-4-2', 'B'), gap('r4-4-3', 'C'), gap('r4-4-4', 'F'), gap('r4-4-5', 'D')] },
    { part: 5, type: 'multiple-choice-cloze', title: 'Getting around without a car', instructions: 'Choose the correct word or phrase for each gap.', passage: 'More people in our town are choosing to [1] the bus to work. A new travel app makes it easier to [2] when buses arrive. The council has also [3] a lower price for weekly tickets. Some people still find the bus [4] at busy times, so extra services will start next month. If the plan is successful, traffic may become [5] and the air could feel [6].', questions: questions('r4-5', [
      ['Gap 1', ['take', 'do', 'make', 'get'], 0], ['Gap 2', ['check', 'watch', 'look', 'see'], 0], ['Gap 3', ['introduced', 'invited', 'invented', 'included'], 0], ['Gap 4', ['crowded', 'empty', 'quiet', 'weak'], 0], ['Gap 5', ['lighter', 'less', 'fewer', 'lower'], 1], ['Gap 6', ['cleaner', 'clearest', 'cleanly', 'clean'], 0],
    ]) },
    { part: 6, type: 'open-cloze', title: 'A shared garden', instructions: 'Complete the text with one word in each gap.', passage: 'Our street has a small garden [1] the library. It was empty [2] several years, so local people decided to use it. Everyone can help, even [3] they have only a little time. We usually meet [4] Saturday morning and share the jobs. Some neighbours grow flowers, [5] others look after the vegetables. We hope the garden will become a place [6] people can relax together.', gaps: [gap('r4-6-1', 'behind'), gap('r4-6-2', 'for'), gap('r4-6-3', 'if'), gap('r4-6-4', 'on'), gap('r4-6-5', 'while'), gap('r4-6-6', 'where')] },
  ],
  writing: { part1: { type: 'email', title: 'Write an email', prompt: 'You have received an email from your English-speaking friend Sam. Write an email to Sam and answer the questions.', sourceEmail: { from: 'Sam', subject: 'Helping the town', body: 'Our class is going to help with an environment project next month. Have you ever helped with a project like this? What could we do to make our town greener? Would you like to join us? Why?' }, notes: ['Say whether you have helped with a project before.', 'Suggest one idea for making the town greener.', 'Say if you would like to join and explain why.'], wordCount: 'about 100 words' }, part2: [
    { type: 'article', title: 'An article about a journey', prompt: 'Your school magazine wants articles about ways to travel around your area. Describe your favourite way to travel and explain why people should try it.', notes: ['Describe the journey.', 'Explain what makes it enjoyable or useful.'], wordCount: 'about 100 words' },
    { type: 'story', title: 'A story about a surprise', prompt: 'Write a story for your English teacher.', openingSentence: 'When I opened the door, I could not believe what I saw.', wordCount: 'about 100 words' },
  ] },
  listening: [
    { part: 1, type: 'short-dialogues', title: 'Short conversations', instructions: 'Listen and choose the correct answer.', clips: [
      clip('l4-1', 'Passenger', 'The bus is nearly here. Do you have the day ticket? I put it on the kitchen table.', 'What has the passenger forgotten?', ['A bus ticket', 'A coat', 'A phone'], 0),
      clip('l4-2', 'Volunteer', 'I thought we were planting flowers, but we are clearing rubbish by the river first.', 'What will the volunteers do first?', ['Plant flowers', 'Clean the river path', 'Build a fence'], 1),
      clip('l4-3', 'Cyclist', 'My front tyre is flat. I will walk the bike to the repair shop before it closes.', 'Why is the cyclist going to the shop?', ['To repair a bicycle', 'To buy a bus pass', 'To meet a friend'], 0),
      clip('l4-4', 'Woman', 'I usually drive to work, but the train is faster when there is traffic. I took it today.', 'How does the woman travel today?', ['By car', 'By train', 'By bicycle'], 1),
      clip('l4-5', 'Shop assistant', 'These bags are made from recycled material, and they fold into a pocket.', 'What is special about the bags?', ['They are easy to carry.', 'They keep food cold.', 'They are made by hand.'], 0),
      clip('l4-6', 'Man', 'The park is lovely, but it is going to rain. Let us have our picnic in the café.', 'Where will they eat?', ['At home', 'In the park', 'In a café'], 2),
      clip('l4-7', 'Woman', 'The new crossing is useful, although the traffic lights take a long time.', 'What does the woman think about the crossing?', ['It is helpful but slow.', 'It is dangerous at night.', 'It is difficult to find.'], 0),
    ] },
    { part: 2, type: 'gist-dialogues', title: 'Everyday conversations', instructions: 'Listen to each conversation and choose the best answer.', clips: [
      clip('l4-8', 'Passenger', 'Is this the bus for the sports centre? Yes, but it takes longer today because of roadworks.', 'Why will the journey take longer?', ['There are road repairs.', 'The bus has broken down.', 'The driver is taking another passenger.'], 0),
      clip('l4-9', 'Friends', 'The market closes at four, so we should go now. I thought it stayed open until six. Not on Sundays.', 'When must they visit the market?', ['Before six today', 'Before four today', 'Tomorrow morning'], 1),
      clip('l4-10', 'Colleagues', 'I sent the travel plan by email. I have not seen it. I will print a copy for you.', 'What will the woman do?', ['Send another email', 'Print the plan', 'Change the journey'], 1),
      clip('l4-11', 'Friends', 'Let us walk to the cinema. It is only ten minutes away. But I am carrying these bags. We can take the bus.', 'How will they probably get there?', ['On foot', 'By bus', 'By taxi'], 1),
      clip('l4-12', 'Neighbours', 'The light in the hall is still on. I will turn it off before we go out.', 'What does the man remind his neighbour to do?', ['Switch off a light', 'Close a window', 'Lock the garden gate'], 0),
      clip('l4-13', 'Friends', 'Would you like tea? Yes, but no sugar, please. I am trying to eat less sweet food.', 'What does the woman want in her tea?', ['Sugar', 'Milk only', 'No sugar'], 2),
    ] },
    { part: 3, type: 'note-completion', title: 'A town clean-up day', instructions: 'Listen and complete the notes with one word in each gap.', script: 'Hello, everyone. I am Priya, and I am organising our town clean-up day. We will meet at the library at nine o’clock on Saturday. Please wear old clothes because we will paint the wooden benches as well as collect litter. The council will provide bags and brushes. We will work in the park until one o’clock, then have lunch together. Bring a bottle of water, but sandwiches will be provided by the café. If you need to borrow gloves, tell me when you arrive.', gaps: [
      { id: 'l4-14', prompt: 'Meeting place: the ___', answer: 'library' }, { id: 'l4-15', prompt: 'Day: ___', answer: 'Saturday' }, { id: 'l4-16', prompt: 'Wear old ___', answer: 'clothes' }, { id: 'l4-17', prompt: 'Work includes painting ___', answer: 'benches' }, { id: 'l4-18', prompt: 'Bring a bottle of ___', answer: 'water' }, { id: 'l4-19', prompt: 'Lunch is provided by the ___', answer: 'café', accepted: ['cafe'] },
    ] },
    { part: 4, type: 'interview', title: 'An interview with a town planner', instructions: 'Listen to the interview and choose the correct answer.', script: 'Interviewer: Alex, why did you become a town planner? Alex: I studied geography at college. During a work placement, I helped improve a small square near a school. People used it more after we added seats and trees, and I wanted to do similar work. Interviewer: What is your current project? Alex: We are planning a safer route for people walking to the hospital. The main challenge is the busy morning traffic. Interviewer: How do you know what local people need? Alex: We organise meetings and ask residents to complete surveys. We also speak with shop owners because they understand how the area changes during the day. Interviewer: What part of your work do you enjoy? Alex: Seeing people use a place that we have improved. Even a small change can make a daily journey easier. Interviewer: What advice would you give someone interested in this job? Alex: Learn to listen carefully and explain your ideas clearly. Plans only work when people understand them.', questions: questions('l4-20', [
      ['What first interested Alex in town planning?', ['Improving a square near a school', 'Building a new hospital', 'Working for a local shop'], 0], ['What is Alex working on now?', ['A shopping centre', 'A safer hospital route', 'A new school building'], 1], ['What is the main difficulty with this project?', ['The morning traffic is heavy.', 'Residents do not use the hospital.', 'The road is too far away.'], 0], ['Why does Alex talk to shop owners?', ['They can help choose trees.', 'They know how the area changes.', 'They organise residents’ meetings.'], 1], ['What does Alex enjoy most?', ['Presenting maps', 'Seeing people use improved places', 'Finishing projects quickly'], 1], ['What advice does Alex give?', ['Listen and explain ideas clearly.', 'Study business instead.', 'Avoid asking residents questions.'], 0],
    ]) },
  ],
  speaking: speaking(4, ['How do you usually travel around your town?', 'What can people do to make their area cleaner?', 'Do you enjoy spending time in parks or gardens? Why?', 'Would you like to live in a city with fewer cars?'], { prompt: 'Neighbours working together in a shared garden.', image: gardenPhoto }, { title: 'Choose a greener way to travel', instructions: 'Record a short response for each visual. Then explain which option could help a town most.', prompt: 'Which change would improve a town the most?', discussionTitle: 'Talk about the environment', images: [{ id: 's4-3-bus', scene: 'train', title: 'More buses', alt: 'Passengers waiting beside a local bus.' }, { id: 's4-3-cycle', scene: 'cycling', title: 'Cycle lanes', alt: 'People cycling safely along a marked lane.' }, { id: 's4-3-walk', scene: 'park', title: 'Walking routes', alt: 'Neighbours walking along a green path.' }, { id: 's4-3-trees', scene: 'garden', title: 'More trees', alt: 'People planting young trees in a city park.' }] }, ['How can people reduce the amount of rubbish they produce?', 'Is it easy to use public transport where you live?', 'Should towns create more car-free streets? Why?']),
};

// Paper five is authored as a separate paper from the same validated structure.
const exam5 = structuredClone(exam4);
exam5.id = 'exam-05';
exam5.title = 'A Weekend Away';
exam5.subtitle = 'Travel, free time and memorable experiences';
exam5.theme = 'Travel & leisure';
function replaceDeep(value, replacements) {
  if (typeof value === 'string') return replacements[value] ?? value;
  if (Array.isArray(value)) return value.map(item => replaceDeep(item, replacements));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceDeep(item, replacements)]));
  return value;
}
const swap = new Map([
  ['Notices and messages', 'Travel notices and messages'],
  ['People and local activities', 'People choosing a weekend activity'],
  ['A repair café in town', 'A weekend at the coast'],
  ['A new cycle route', 'A walking path by the sea'],
  ['Getting around without a car', 'Planning a day trip'],
  ['A shared garden', 'A day by the sea'],
  ['A Greener City', 'A Weekend Away'],
  ['Transport, local projects and caring for the environment', 'Travel, free time and memorable experiences'],
  ['City life & the environment', 'Travel & leisure'],
  ['A town clean-up day', 'A school trip to the coast'],
  ['An interview with a town planner', 'An interview with a travel writer'],
  ['Helping the town', 'Planning a weekend trip'],
]);
exam5.reading = exam5.reading.map(part => {
  const mapped = replaceDeep(part, swap);
  mapped.questions?.forEach((question, index) => { question.id = `r5-${part.part}-${index + 1}`; });
  mapped.gaps?.forEach((item, index) => { item.id = `r5-${part.part}-${index + 1}`; });
  if (mapped.part === 1) {
    mapped.passage = ['COACH TICKETS: Book online by Friday to get a lower price. Show the driver your ticket on your phone.', 'HOSTEL: Breakfast is served from 7:30 to 9:00. Please leave your key at reception when you check out.', 'LUCY: The 10:15 train is cancelled. I am taking the coach instead, so meet me outside the station at noon.', 'MUSEUM: The photography exhibition is closed on Mondays. The rest of the museum opens as usual.', 'BIKE TOUR: Meet at the harbour at 11 a.m. Helmets and bikes are included in the price.'];
    mapped.questions = questions('r5-1', [['What should coach passengers do?', ['Buy a ticket on the bus.', 'Show a ticket on their phone.', 'Arrive before Friday.'], 1], ['What must hostel guests do when they leave?', ['Return their key.', 'Eat breakfast before 7:30.', 'Clean their room.'], 0], ['What should Lucy’s friend expect?', ['Lucy will arrive by train.', 'Lucy will meet them at the harbour.', 'Lucy will arrive at noon.'], 2], ['What can visitors do on Monday?', ['See the photography exhibition.', 'Visit other parts of the museum.', 'Join a guided bike tour.'], 1], ['What is included in the bike tour?', ['A meal by the harbour.', 'A helmet and bicycle.', 'A train ticket.'], 1]]);
  }
  if (mapped.part === 3) {
    mapped.passage = 'Last summer, my cousin invited me to spend a weekend in a small seaside town. We travelled by coach because it was cheaper than the train, although the journey took longer. When we arrived, the weather was cloudy, so we visited the local museum first. I expected it to be rather boring, but a guide showed us old photographs of the harbour and explained how the fishing boats had changed over time.\n\nThe next morning was sunny. We hired bicycles and followed a path along the coast. The route was mostly flat, but we stopped several times to take photographs. At lunchtime, we bought sandwiches from a small shop and ate them on the beach. It was busy, but we found a quiet place near the rocks.\n\nOn Sunday, we planned to take a boat trip. Unfortunately, the sea was too rough, so the trip was cancelled. The owner gave everyone a refund and suggested a walk to a lighthouse instead. I was disappointed at first, but the view from the top was wonderful. I would happily return, especially if I could stay for a few more days.';
    mapped.questions = questions('r5-3', [['Why did the writer travel by coach?', ['It was less expensive.', 'It was faster.', 'It stopped at the museum.'], 0], ['What surprised the writer at the museum?', ['How interesting the guide was.', 'How many boats were outside.', 'How new the photographs were.'], 0], ['What did they do on the coast path?', ['They took photographs.', 'They bought bicycles.', 'They swam in the sea.'], 0], ['Why was the boat trip cancelled?', ['The weather at sea was unsafe.', 'The owner had no passengers.', 'The lighthouse was closed.'], 0], ['What does the writer say about the weekend?', ['They would like a longer visit.', 'They did not enjoy the town.', 'They want to travel by train next time.'], 0]]);
  }
  return mapped;
});
exam5.reading[1].people = [
  { id:'p1', text:'Lena wants to see paintings and can only visit on a weekday afternoon.' },
  { id:'p2', text:'Mark is interested in local history and wants an activity for a rainy morning.' },
  { id:'p3', text:'Sofia wants to enjoy the sea views but cannot walk up steep hills.' },
  { id:'p4', text:'Tom would like to try a water sport with an instructor.' },
  { id:'p5', text:'Nadia wants to buy a small gift made by people in the area.' },
];
exam5.reading[1].texts = [
  { id:'A', title:'Harbour art gallery', text:'Our gallery is open Tuesday to Sunday until 5 p.m. See work by local painters and photographers. Admission is free.' },
  { id:'B', title:'Maritime museum', text:'Discover how fishing and boat building changed the town. Open daily from 9:30, with indoor activities for families.' },
  { id:'C', title:'Coastal bus tour', text:'Enjoy the cliffs and beaches from a comfortable bus. The route is level and has several stops for photographs.' },
  { id:'D', title:'Try sailing', text:'Join a qualified instructor for a beginner lesson in the harbour. All safety equipment is included.' },
  { id:'E', title:'Craft market', text:'Meet local makers and choose a handmade present. Open every Saturday and Sunday beside the harbour.' },
  { id:'F', title:'Forest trail', text:'Follow a marked path through the woods. The walk takes two hours and includes a steep climb.' },
  { id:'G', title:'Seafood cookery', text:'Learn to prepare a simple fish meal in our evening class. Book at least one day ahead.' },
  { id:'H', title:'Island ferry', text:'Take a boat to the island for a full day. Services depend on the weather and sea conditions.' },
];
exam5.reading[1].questions = ['Lena','Mark','Sofia','Tom','Nadia'].map((name, i) => q(`r5-2-${i + 1}`, name, letters, i));
exam5.reading[3].sentences = ['A small visitor centre near the entrance explains the area’s history.', 'It passes several quiet beaches and a nature reserve.', 'Walkers can rest and enjoy the sea views along the way.', 'The old building was repaired and opened to visitors last spring.', 'This extension will make it possible to walk all the way to the next village.', 'Most visitors prefer to travel there by car.'];
exam5.reading[3].gaps = ['A','B','C','D','E'].map((answer, index) => gap(`r5-4-${index + 1}`, answer));
exam5.reading[3].passage = 'The coastal path is popular with visitors and local people. [1] It begins near the old harbour and continues past a small museum. [2] The town has added signs so walkers can find the route easily. There are benches at several points, and most of the path is flat. [3] Some families bring a picnic and stop beside the beach. The final section goes uphill towards a lighthouse. [4] On clear days, you can see several islands from the top. The council hopes to extend the path next year. [5]';
exam5.reading[4].passage = 'Many families [1] a day trip by train during the school holidays. It is useful to [2] the timetable before leaving home. Some tickets are [3] expensive if you book early. The station is [4] the town centre, so visitors can walk to the shops. If it rains, you can [5] the local museum. Remember to [6] a bottle of water for the journey.';
exam5.reading[4].questions = questions('r5-5', [['Gap 1', ['take', 'do', 'make', 'get'], 0], ['Gap 2', ['check', 'look', 'watch', 'see'], 0], ['Gap 3', ['less', 'fewer', 'little', 'least'], 0], ['Gap 4', ['near', 'between', 'through', 'across'], 0], ['Gap 5', ['visit', 'travel', 'arrive', 'reach'], 0], ['Gap 6', ['bring', 'carry on', 'put', 'take off'], 0]]);
exam5.reading[5].passage = 'We arrived [1] the coast before lunchtime. The weather was warmer [2] we had expected, so we left our coats in the car. My sister wanted to swim, [3] the water was too cold. We walked [4] the harbour and watched the boats. Later, we found a café [5] served fresh sandwiches. It was a day [6] we will remember.';
exam5.reading[5].gaps = ['at','than','but','around','that','which'].map((answer, index) => gap(`r5-6-${index + 1}`, answer));
exam5.writing.part1 = { type: 'email', title: 'Write an email', prompt: 'You have received an email from your English-speaking friend Alex. Write an email to Alex and answer the questions.', sourceEmail: { from: 'Alex', subject: 'A weekend trip', body: 'I am planning a weekend trip with my family. Where do you like going for a short break? What should we take with us? Would you prefer to travel by train or coach? Why?' }, notes: ['Say where you like going for a short break.', 'Suggest something to take.', 'Choose train or coach and give a reason.'], wordCount: 'about 100 words' };
exam5.writing.part2 = [
  { type: 'article', title: 'An article about a special place', prompt: 'Your school magazine wants articles about places to visit. Describe a place you enjoyed visiting and explain why other people should go there.', notes: ['Describe the place.', 'Explain what visitors can do there.'], wordCount: 'about 100 words' },
  { type: 'story', title: 'A story about a journey', prompt: 'Write a story for your English teacher.', openingSentence: 'We were almost at the station when I realised I had left something important behind.', wordCount: 'about 100 words' },
];
exam5.listening = exam5.listening.map((part, partIndex) => {
  const mapped = replaceDeep(part, new Map());
  if (mapped.clips) mapped.clips.forEach((item, index) => { item.id = `l5-${part.part}-${index + 1}`; item.question.id = item.id; });
  if (mapped.gaps) mapped.gaps.forEach((item, index) => { item.id = `l5-${part.part}-${index + 1}`; });
  if (mapped.questions) mapped.questions.forEach((item, index) => { item.id = `l5-${part.part}-${index + 1}`; });
  return mapped;
});
exam5.listening[0].clips = [
  clip('l5-1-1','Traveller','I thought the museum closed at five, but the sign says six. We have time to see the last room.','What does the traveller learn?',['The museum closes later than expected.','The last room is not open.','The museum is closed today.'],0),
  clip('l5-1-2','Friends','I booked the table for seven. Could we make it half past? The train gets in at six forty.','What time will they probably meet?',['Seven o’clock.','Half past seven.','Six forty.'],1),
  clip('l5-1-3','Woman','The beach is beautiful, but I forgot my towel. We can buy one in the shop near the car park.','What has the woman forgotten?',['A towel.','Her camera.','The car keys.'],0),
  clip('l5-1-4','Man','I usually go walking on Sundays, but this week I am taking my niece to the aquarium.','What is the man doing this Sunday?',['Going for a walk.','Visiting an aquarium.','Taking a train trip.'],1),
  clip('l5-1-5','Shop assistant','The blue backpack has more pockets. The red one is lighter, though. I will take the red one for the trip.','Which backpack does the customer choose?',['The blue one.','The red one.','Neither backpack.'],1),
  clip('l5-1-6','Friends','The boat leaves from the harbour at ten. We should get there by quarter to, just in case.','When should they arrive?',['At ten.','At quarter past ten.','At quarter to ten.'],2),
  clip('l5-1-7','Woman','The walk was longer than I expected, but the view from the hill made it worthwhile.','What did the woman enjoy?',['The view.','The short distance.','The weather.'],0),
];
exam5.listening[1].clips = [
  clip('l5-2-1','Friends','Shall we take the early train? It is cheaper, but we would have to get up before six.','Why are they considering the early train?',['It costs less.','It is more comfortable.','It arrives after lunch.'],0),
  clip('l5-2-2','Friends','I wanted to sit outside, but all the tables are wet. Let us find a place inside.','Where will they sit?',['Outside.','Inside.','At home.'],1),
  clip('l5-2-3','Customer','Does the walking tour start here? It does, but you need to collect a map from reception first.','What must the customer do before the tour?',['Get a map.','Buy a ticket on the bus.','Wait for the guide outside.'],0),
  clip('l5-2-4','Friends','The lighthouse is a long way from here. We could rent bicycles, or take the local bus.','How might they travel to the lighthouse?',['By bicycle or bus.','By boat only.','On foot only.'],0),
  clip('l5-2-5','Man','I did not enjoy the hotel breakfast. It was fine, but there were not many choices.','What did the man think about breakfast?',['There was a lot to choose from.','It was acceptable but limited.','It was excellent.'],1),
  clip('l5-2-6','Friends','I have the tickets on my phone. Great. I will keep the address in case we need it.','What does the woman have?',['The tickets.','The hotel address.','A paper map.'],0),
];
exam5.listening[2].script = 'Welcome to the Hilltop Hostel. The front door is locked after eleven, so please take your key with you. Breakfast is served in the dining room from half past seven. If you want to join the guided walk, meet our guide, Mr Green, at the entrance at nine o’clock. The walk takes about two hours. You can leave your bags in the small room beside reception after you check out. There is a bus stop opposite the hostel, and buses to the station leave every twenty minutes.';
exam5.listening[2].gaps = [
  { id:'l5-3-1',prompt:'Door is locked after ___',answer:'eleven' },{ id:'l5-3-2',prompt:'Breakfast starts at half past ___',answer:'seven' },{ id:'l5-3-3',prompt:'Walk leader: Mr ___',answer:'Green' },{ id:'l5-3-4',prompt:'Walk lasts about ___ hours',answer:'two' },{ id:'l5-3-5',prompt:'Bags can be left beside ___',answer:'reception' },{ id:'l5-3-6',prompt:'Buses leave every ___ minutes',answer:'twenty' },
];
exam5.listening[3].script = 'Interviewer: Nina, what do you write about? Nina: I write travel articles for a website. I started by sending photographs and short reports to a local newspaper. Interviewer: How do you choose a place to visit? Nina: I read about its history first, but I also ask local people what they enjoy doing. Interviewer: What is the hardest part of your job? Nina: Sometimes the weather changes my plans. I once travelled to a village to write about a festival, but heavy rain meant the outdoor events were cancelled. Interviewer: What do you enjoy most? Nina: Meeting people and discovering places I would never find in a guidebook. Interviewer: What advice would you give a new writer? Nina: Keep a notebook, take clear photographs and check every detail before you publish.';
exam5.listening[3].questions = questions('l5-4', [['How did Nina begin writing?', ['She sent reports to a newspaper.', 'She wrote a travel book.', 'She worked for a hotel.'],0],['How does Nina choose places?', ['She asks local people and reads about them.', 'She only visits famous cities.', 'She follows a fixed list.'],0],['What once changed Nina’s plans?', ['Heavy rain.', 'A train delay.', 'A missing camera.'],0],['What does Nina enjoy most?', ['Meeting people and finding new places.', 'Writing about hotels.', 'Travelling alone.'],0],['What should a new writer do?', ['Check details before publishing.', 'Avoid taking photographs.', 'Write without a notebook.'],0],['Where does Nina work?', ['For a travel website.', 'At a newspaper office.', 'In a museum.'],0]]);
exam5.speaking = speaking(5, ['Where do you like going on holiday?', 'What do you usually take on a day trip?', 'Do you prefer travelling by car or public transport?', 'What was the last interesting place you visited?'], { prompt:'A couple preparing a meal together at home.', image:cookingPhoto }, { title:'Choose an activity for a free Saturday',instructions:'Record a short response for each visual. Then explain which activity you would choose.',prompt:'Which activity would be best for a group of friends?',discussionTitle:'Talk about free-time activities',images:[{id:'s5-3-walk',scene:'park',title:'A country walk',alt:'Friends walking along a countryside path.'},{id:'s5-3-museum',scene:'museum',title:'A museum visit',alt:'Visitors looking at an exhibition.'},{id:'s5-3-music',scene:'music',title:'Live music',alt:'Friends listening to live music.'},{id:'s5-3-beach',scene:'beach',title:'A beach picnic',alt:'Friends having a picnic near the sea.'}]},['What makes a holiday enjoyable?', 'Do you prefer active holidays or relaxing holidays?', 'How can visitors help protect places they visit?']);

for (const [filename, exam] of [['exam-04.json', exam4], ['exam-05.json', exam5]]) {
  writeFileSync(new URL(`../src/data/${filename}`, import.meta.url), `${JSON.stringify(exam, null, 2)}\n`);
}
