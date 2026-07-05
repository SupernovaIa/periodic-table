// Standard Model of particle physics — 17 elementary particles, bilingual (en/es).
// Layout (Standard Model chart):
//   cols 1-3 = generations (quarks in rows 1-2, leptons in rows 3-4)
//   col 4    = gauge bosons (gluon, photon, Z, W)
//   col 5    = Higgs (tall cell spanning the 4 rows)
//
//  id     internal id
//  s      display symbol (may contain HTML, e.g. subscripts)
//  name   {en,es}
//  cat    category (color key): quark | lepton | gauge-boson | scalar-boson
//  col,row grid position; span = extra rows (Higgs)
//  mass   mass string with units
//  charge electric charge
//  spin   spin
//  gen    generation (1-3) or null for bosons
//  role   {en,es} interactions / what it does
//  year   year discovered / established
//  about  {en,es}

const PARTICLE_CATEGORIES = {
  "quark":        { en: "Quark",        es: "Quark" },
  "lepton":       { en: "Lepton",       es: "Leptón" },
  "gauge-boson":  { en: "Gauge boson",  es: "Bosón de gauge" },
  "scalar-boson": { en: "Scalar boson", es: "Bosón escalar" }
};

const PARTICLE_UI = {
  en: {
    elements: "Elements",
    particles: "Particles",
    title: "The Standard Model",
    subtitle: "Physics · Interactive",
    footer: "17 elementary particles · data for educational purposes",
    labels: {
      type: "Type", gen: "Generation", mass: "Mass",
      charge: "Electric charge", spin: "Spin",
      role: "Interactions", year: "Discovered"
    }
  },
  es: {
    elements: "Elementos",
    particles: "Partículas",
    title: "El Modelo Estándar",
    subtitle: "Física · Interactiva",
    footer: "17 partículas elementales · datos con fines educativos",
    labels: {
      type: "Tipo", gen: "Generación", mass: "Masa",
      charge: "Carga eléctrica", spin: "Espín",
      role: "Interacciones", year: "Descubrimiento"
    }
  }
};

const Q = { en: "Strong, weak, EM, gravity", es: "Fuerte, débil, EM, gravedad" };
const LEP = { en: "Weak, EM, gravity", es: "Débil, EM, gravedad" };
const NEU = { en: "Weak, gravity", es: "Débil, gravedad" };

const PARTICLES = [
  // --- Quarks (row 1: up-type, row 2: down-type) ---
  {id:"up",s:"u",name:{en:"Up quark",es:"Quark up"},cat:"quark",col:1,row:1,mass:"2.2 MeV/c²",charge:"+⅔",spin:"½",gen:1,role:Q,year:1968,about:{en:"Lightest quark; two ups and a down make a proton.",es:"El quark más ligero; dos up y un down forman un protón."}},
  {id:"charm",s:"c",name:{en:"Charm quark",es:"Quark charm"},cat:"quark",col:2,row:1,mass:"1.28 GeV/c²",charge:"+⅔",spin:"½",gen:2,role:Q,year:1974,about:{en:"Second-generation up-type quark; its discovery confirmed the quark model.",es:"Quark tipo up de segunda generación; su descubrimiento confirmó el modelo de quarks."}},
  {id:"top",s:"t",name:{en:"Top quark",es:"Quark top"},cat:"quark",col:3,row:1,mass:"173 GeV/c²",charge:"+⅔",spin:"½",gen:3,role:Q,year:1995,about:{en:"The heaviest known elementary particle, as heavy as a gold atom.",es:"La partícula elemental más pesada conocida, tanto como un átomo de oro."}},
  {id:"down",s:"d",name:{en:"Down quark",es:"Quark down"},cat:"quark",col:1,row:2,mass:"4.7 MeV/c²",charge:"−⅓",spin:"½",gen:1,role:Q,year:1968,about:{en:"Two downs and an up make a neutron.",es:"Dos down y un up forman un neutrón."}},
  {id:"strange",s:"s",name:{en:"Strange quark",es:"Quark strange"},cat:"quark",col:2,row:2,mass:"95 MeV/c²",charge:"−⅓",spin:"½",gen:2,role:Q,year:1968,about:{en:"Second-generation down-type quark, found in kaons and hyperons.",es:"Quark tipo down de segunda generación, presente en kaones e hiperones."}},
  {id:"bottom",s:"b",name:{en:"Bottom quark",es:"Quark bottom"},cat:"quark",col:3,row:2,mass:"4.18 GeV/c²",charge:"−⅓",spin:"½",gen:3,role:Q,year:1977,about:{en:"Third-generation down-type quark; key to studying matter–antimatter asymmetry.",es:"Quark tipo down de tercera generación; clave para estudiar la asimetría materia-antimateria."}},

  // --- Leptons (row 3: charged, row 4: neutrinos) ---
  {id:"electron",s:"e",name:{en:"Electron",es:"Electrón"},cat:"lepton",col:1,row:3,mass:"0.511 MeV/c²",charge:"−1",spin:"½",gen:1,role:LEP,year:1897,about:{en:"Carries electric current and forms the outer shells of atoms.",es:"Transporta la corriente eléctrica y forma las capas externas de los átomos."}},
  {id:"muon",s:"μ",name:{en:"Muon",es:"Muón"},cat:"lepton",col:2,row:3,mass:"105.7 MeV/c²",charge:"−1",spin:"½",gen:2,role:LEP,year:1936,about:{en:"A heavier cousin of the electron; created by cosmic rays.",es:"Un primo más pesado del electrón; se crea con los rayos cósmicos."}},
  {id:"tau",s:"τ",name:{en:"Tau",es:"Tau"},cat:"lepton",col:3,row:3,mass:"1.777 GeV/c²",charge:"−1",spin:"½",gen:3,role:LEP,year:1975,about:{en:"The heaviest lepton; so massive it decays almost instantly.",es:"El leptón más pesado; tan masivo que se desintegra casi al instante."}},
  {id:"e-neutrino",s:"ν<sub>e</sub>",name:{en:"Electron neutrino",es:"Neutrino electrónico"},cat:"lepton",col:1,row:4,mass:"< 1 eV/c²",charge:"0",spin:"½",gen:1,role:NEU,year:1956,about:{en:"Nearly massless and neutral; trillions pass through you each second.",es:"Casi sin masa y neutro; billones te atraviesan cada segundo."}},
  {id:"mu-neutrino",s:"ν<sub>μ</sub>",name:{en:"Muon neutrino",es:"Neutrino muónico"},cat:"lepton",col:2,row:4,mass:"< 1 eV/c²",charge:"0",spin:"½",gen:2,role:NEU,year:1962,about:{en:"The neutrino partner of the muon.",es:"El neutrino asociado al muón."}},
  {id:"tau-neutrino",s:"ν<sub>τ</sub>",name:{en:"Tau neutrino",es:"Neutrino tauónico"},cat:"lepton",col:3,row:4,mass:"< 1 eV/c²",charge:"0",spin:"½",gen:3,role:NEU,year:2000,about:{en:"The last fermion of the Standard Model to be detected.",es:"El último fermión del Modelo Estándar en ser detectado."}},

  // --- Gauge bosons (force carriers) ---
  {id:"gluon",s:"g",name:{en:"Gluon",es:"Gluón"},cat:"gauge-boson",col:4,row:1,mass:"0",charge:"0",spin:"1",gen:null,role:{en:"Carries the strong force",es:"Transmite la fuerza fuerte"},year:1979,about:{en:"Binds quarks together inside protons and neutrons.",es:"Une los quarks dentro de protones y neutrones."}},
  {id:"photon",s:"γ",name:{en:"Photon",es:"Fotón"},cat:"gauge-boson",col:4,row:2,mass:"0",charge:"0",spin:"1",gen:null,role:{en:"Carries electromagnetism",es:"Transmite el electromagnetismo"},year:1905,about:{en:"The particle of light and all electromagnetic radiation.",es:"La partícula de la luz y de toda la radiación electromagnética."}},
  {id:"z-boson",s:"Z",name:{en:"Z boson",es:"Bosón Z"},cat:"gauge-boson",col:4,row:3,mass:"91.19 GeV/c²",charge:"0",spin:"1",gen:null,role:{en:"Carries the weak force",es:"Transmite la fuerza débil"},year:1983,about:{en:"A neutral carrier of the weak force, behind some radioactive decays.",es:"Portador neutro de la fuerza débil, tras algunas desintegraciones radiactivas."}},
  {id:"w-boson",s:"W",name:{en:"W boson",es:"Bosón W"},cat:"gauge-boson",col:4,row:4,mass:"80.4 GeV/c²",charge:"±1",spin:"1",gen:null,role:{en:"Carries the weak force",es:"Transmite la fuerza débil"},year:1983,about:{en:"A charged carrier of the weak force; drives beta decay and powers the Sun.",es:"Portador cargado de la fuerza débil; causa la desintegración beta y alimenta al Sol."}},

  // --- Scalar boson ---
  {id:"higgs",s:"H",name:{en:"Higgs boson",es:"Bosón de Higgs"},cat:"scalar-boson",col:5,row:1,span:4,mass:"125.1 GeV/c²",charge:"0",spin:"0",gen:null,role:{en:"Gives particles their mass",es:"Da masa a las partículas"},year:2012,about:{en:"Excitation of the Higgs field, which gives mass to the other particles; found at CERN in 2012.",es:"Excitación del campo de Higgs, que da masa a las demás partículas; hallado en el CERN en 2012."}}
];
