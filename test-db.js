fetch('http://localhost:3000/api/activities')
  .then(res => res.json())
  .then(data => console.log('Data from DB:', data));