

var person = {
  firstName: 'Charles',
  lastName:  'Jolley',
  address: {
    street: '4388 El Camino Real'
  }
};

var metal = require('bolt-metal');

metal.bind(person, 'address', 'change:street', function() {
  console.log('CHANGED STREET!');
});

metal.bind(person, 'address', 'change', function() {
  console.log('CHANGED ANY!');
});

person.address.street = '123 Main St.';
metal.trigger(person.address, 'change:street', '123 Main St.');
> 'CHANGED STREET!'
> 'CHANGED ANY!'

var person2 = metal.create(person);
metal.trigger(person2.address, 'change:street');
> 'CHANGED STREET!'
> 'CHANGED ANY!'

metal.resetListeners(person2);


