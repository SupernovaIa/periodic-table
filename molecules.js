// Molecules in 3D — prototype catalogue, bilingual (en/es).
// Geometries are real 3D conformers from PubChem (CC0), centred on the centroid.
//
//  id     internal id
//  f      formula (HTML, e.g. subscripts)
//  name   {en,es}
//  cat    category (color key): inorganic | organic | bio
//  mass   molar mass (g/mol)
//  geom   {en,es} molecular geometry / shape
//  about  {en,es}
//  atoms  [symbol, x, y, z] in Å (PubChem 3D conformer)
//  bonds  [atomIndexA, atomIndexB, order] (0-indexed)

const MOLECULE_CATEGORIES = {
  "inorganic": { en: "Inorganic",    es: "Inorgánica" },
  "organic":   { en: "Organic",      es: "Orgánica" },
  "bio":       { en: "Biomolecules", es: "Biomoléculas" },
  "drugs":     { en: "Drugs",        es: "Fármacos" }
};

// Tag vocabulary: molecules reference these slugs in their `tags` array.
// Shown as chips in the detail panel and matched by the search box.
const MOLECULE_TAGS = {
  "polar":            { en: "Polar",            es: "Polar" },
  "solvent":          { en: "Solvent",          es: "Disolvente" },
  "gas":              { en: "Gas",              es: "Gas" },
  "greenhouse":       { en: "Greenhouse gas",   es: "Gas de efecto invernadero" },
  "hydrocarbon":      { en: "Hydrocarbon",      es: "Hidrocarburo" },
  "alcohol":          { en: "Alcohol",          es: "Alcohol" },
  "acid":             { en: "Acid",             es: "Ácido" },
  "aromatic":         { en: "Aromatic",         es: "Aromático" },
  "sugar":            { en: "Sugar",            es: "Azúcar" },
  "amino-acid":       { en: "Amino acid",       es: "Aminoácido" },
  "lipid":            { en: "Lipid",            es: "Lípido" },
  "nucleobase":       { en: "Nucleobase",       es: "Base nitrogenada" },
  "neurotransmitter": { en: "Neurotransmitter", es: "Neurotransmisor" },
  "vitamin":          { en: "Vitamin",          es: "Vitamina" },
  "energy":           { en: "Cell energy",      es: "Energía celular" },
  "analgesic":        { en: "Analgesic",        es: "Analgésico" },
  "antibiotic":       { en: "Antibiotic",       es: "Antibiótico" },
  "stimulant":        { en: "Stimulant",        es: "Estimulante" },
  "alkaloid":         { en: "Alkaloid",         es: "Alcaloide" },
  "oxidizer":         { en: "Oxidizer",         es: "Oxidante" }
};

// CPK-inspired colors, lightened for the dark theme. r = display radius (Å).
const ATOM_STYLE = {
  H:  { color: "#e9edf4", r: 0.34 },
  C:  { color: "#9aa5b1", r: 0.48 },
  N:  { color: "#6b8aff", r: 0.46 },
  O:  { color: "#ff6d66", r: 0.44 },
  S:  { color: "#ffd75e", r: 0.52 },
  P:  { color: "#ff9d4d", r: 0.52 },
  Cl: { color: "#6fdc6f", r: 0.50 },
  Na: { color: "#b98bf5", r: 0.58 }
};
const ATOM_STYLE_DEFAULT = { color: "#c0c8d4", r: 0.45 };

const MOLECULE_UI = {
  en: {
    molecules: "Molecules",
    title: "Molecules in 3D",
    subtitle: "Chemistry · Interactive",
    footer: "3D structures from PubChem · data for educational purposes",
    drag: "Drag to rotate",
    search: "Search molecule, formula or tag…",
    labels: {
      formula: "Formula", mass: "Molar mass", atoms: "Atoms",
      bonds: "Bonds", geom: "Shape", type: "Type", tags: "Tags"
    }
  },
  es: {
    molecules: "Moléculas",
    title: "Moléculas en 3D",
    subtitle: "Química · Interactiva",
    footer: "Estructuras 3D de PubChem · datos con fines educativos",
    drag: "Arrastra para rotar",
    search: "Busca molécula, fórmula o etiqueta…",
    labels: {
      formula: "Fórmula", mass: "Masa molar", atoms: "Átomos",
      bonds: "Enlaces", geom: "Geometría", type: "Tipo", tags: "Etiquetas"
    }
  }
};

const MOLECULES = [
  {id:"water",s:"H<sub>2</sub>O",name:{en:"Water",es:"Agua"},cat:"inorganic",mass:18.02,tags:["polar","solvent"],
   geom:{en:"Bent",es:"Angular"},
   about:{en:"The universal solvent. Its bent shape makes it polar — the origin of most of its unusual properties, from surface tension to being liquid at room temperature.",
          es:"El disolvente universal. Su forma angular la hace polar: el origen de casi todas sus propiedades inusuales, de la tensión superficial a ser líquida a temperatura ambiente."},
   atoms:[["O",-0.295,-0.218,0.154],["H",-0.017,0.675,0.409],["H",0.312,-0.457,-0.563]],
   bonds:[[0,1,1],[0,2,1]]},

  {id:"co2",s:"CO<sub>2</sub>",name:{en:"Carbon dioxide",es:"Dióxido de carbono"},cat:"inorganic",mass:44.01,tags:["gas","greenhouse"],
   geom:{en:"Linear",es:"Lineal"},
   about:{en:"Produced by combustion and respiration, consumed by photosynthesis. Perfectly linear and non-polar, yet a powerful greenhouse gas because it absorbs infrared radiation.",
          es:"Producto de la combustión y la respiración, consumido en la fotosíntesis. Perfectamente lineal y apolar, pero un potente gas de efecto invernadero porque absorbe radiación infrarroja."},
   atoms:[["O",-1.197,0.0,0.0],["O",1.197,0.0,0.0],["C",0.0,0.0,0.0]],
   bonds:[[0,2,2],[1,2,2]]},

  {id:"methane",s:"CH<sub>4</sub>",name:{en:"Methane",es:"Metano"},cat:"organic",mass:16.04,tags:["hydrocarbon","gas","greenhouse"],
   geom:{en:"Tetrahedral",es:"Tetraédrica"},
   about:{en:"The simplest hydrocarbon and the main component of natural gas. Its four bonds point to the corners of a perfect tetrahedron, 109.5° apart.",
          es:"El hidrocarburo más simple y componente principal del gas natural. Sus cuatro enlaces apuntan a los vértices de un tetraedro perfecto, separados 109,5°."},
   atoms:[["C",0.0,0.0,0.0],["H",0.554,0.8,0.496],["H",0.683,-0.813,-0.254],["H",-0.778,-0.374,0.669],["H",-0.459,0.387,-0.912]],
   bonds:[[0,1,1],[0,2,1],[0,3,1],[0,4,1]]},

  {id:"ethanol",s:"C<sub>2</sub>H<sub>5</sub>OH",name:{en:"Ethanol",es:"Etanol"},cat:"organic",mass:46.07,tags:["alcohol","solvent"],
   geom:{en:"Tetrahedral carbons",es:"Carbonos tetraédricos"},
   about:{en:"The alcohol in drinks and a common biofuel. Its hydroxyl group (–OH) forms hydrogen bonds with water, which is why it mixes with it in any proportion.",
          es:"El alcohol de las bebidas y un biocombustible común. Su grupo hidroxilo (–OH) forma puentes de hidrógeno con el agua, por eso se mezcla con ella en cualquier proporción."},
   atoms:[["O",-1.537,0.311,-0.089],["C",-0.412,-0.555,-0.089],["C",0.852,0.279,-0.089],["H",-0.461,-1.2,0.793],["H",-0.461,-1.182,-0.983],["H",1.74,-0.36,-0.106],["H",0.877,0.942,-0.959],["H",0.896,0.917,0.8],["H",-1.495,0.848,0.721]],
   bonds:[[0,1,1],[0,8,1],[1,2,1],[1,3,1],[1,4,1],[2,5,1],[2,6,1],[2,7,1]]},

  {id:"benzene",s:"C<sub>6</sub>H<sub>6</sub>",name:{en:"Benzene",es:"Benceno"},cat:"organic",mass:78.11,tags:["aromatic","hydrocarbon","solvent"],
   geom:{en:"Planar hexagon",es:"Hexágono plano"},
   about:{en:"The archetypal aromatic ring: six carbons sharing a cloud of delocalized electrons. The starting point of aromatic chemistry, from plastics to medicines.",
          es:"El anillo aromático arquetípico: seis carbonos que comparten una nube de electrones deslocalizados. El punto de partida de la química aromática, de los plásticos a los medicamentos."},
   atoms:[["C",-1.213,-0.688,0.0],["C",-1.203,0.706,0.0],["C",-0.01,-1.395,0.0],["C",0.01,1.395,0.0],["C",1.203,-0.706,0.0],["C",1.213,0.688,0.0],["H",-2.158,-1.224,0.0],["H",-2.139,1.256,0.0],["H",-0.018,-2.481,0.0],["H",0.018,2.481,0.0],["H",2.139,-1.256,0.0],["H",2.158,1.224,0.0]],
   bonds:[[0,1,2],[0,2,1],[0,6,1],[1,3,1],[1,7,1],[2,4,2],[2,8,1],[3,5,2],[3,9,1],[4,5,1],[4,10,1],[5,11,1]]},

  {id:"aspirin",s:"C<sub>9</sub>H<sub>8</sub>O<sub>4</sub>",name:{en:"Aspirin",es:"Aspirina"},cat:"drugs",mass:180.16,tags:["analgesic","aromatic"],
   geom:{en:"Aromatic ring + esters",es:"Anillo aromático + ésteres"},
   about:{en:"Acetylsalicylic acid, one of the oldest synthetic drugs (1897). It relieves pain and inflammation by blocking the enzymes that produce prostaglandins.",
          es:"Ácido acetilsalicílico, uno de los fármacos sintéticos más antiguos (1897). Alivia el dolor y la inflamación bloqueando las enzimas que producen prostaglandinas."},
   atoms:[["O",1.135,0.399,0.788],["O",-0.793,-2.87,-0.742],["O",0.698,-2.34,0.877],["O",1.683,0.655,-1.474],["C",-0.184,0.453,0.449],["C",-0.891,-0.707,0.133],["C",-0.827,1.691,0.422],["C",-2.241,-0.629,-0.21],["C",-2.177,1.768,0.079],["C",-2.884,0.608,-0.237],["C",-0.239,-2.009,0.156],["C",2.011,0.516,-0.303],["C",3.432,0.444,0.172],["H",-0.283,2.599,0.668],["H",-2.823,-1.516,-0.448],["H",-2.678,2.732,0.059],["H",-3.936,0.668,-0.5],["H",3.631,1.263,0.868],["H",4.106,0.542,-0.684],["H",3.612,-0.521,0.651],["H",-0.354,-3.747,-0.725]],
   bonds:[[0,4,1],[0,11,1],[1,10,1],[1,20,1],[2,10,2],[3,11,2],[4,5,1],[4,6,2],[5,7,2],[5,10,1],[6,8,1],[6,13,1],[7,9,1],[7,14,1],[8,9,2],[8,15,1],[9,16,1],[11,12,1],[12,17,1],[12,18,1],[12,19,1]]},

  {id:"caffeine",s:"C<sub>8</sub>H<sub>10</sub>N<sub>4</sub>O<sub>2</sub>",name:{en:"Caffeine",es:"Cafeína"},cat:"drugs",mass:194.19,tags:["stimulant","alkaloid"],
   geom:{en:"Fused planar rings",es:"Anillos planos fusionados"},
   about:{en:"The world's most consumed psychoactive substance. Its shape mimics adenosine, so it blocks the brain receptors that signal tiredness.",
          es:"La sustancia psicoactiva más consumida del mundo. Su forma imita a la adenosina, así que bloquea los receptores cerebrales que señalan el cansancio."},
   atoms:[["O",0.406,2.526,0.0],["O",-3.191,-0.487,-0.001],["N",-1.032,-1.356,0.0],["N",2.155,0.098,-0.001],["N",-1.411,1.037,0.0],["N",1.348,-1.98,0.0],["C",0.794,0.216,-0.001],["C",0.326,-1.07,-0.001],["C",-0.033,1.379,-0.001],["C",-1.97,-0.293,-0.001],["C",2.44,-1.243,0.0],["C",-1.491,-2.739,0.0],["C",3.129,1.163,0.0],["C",-2.36,2.145,0.0],["H",3.453,-1.622,0.0],["H",-1.109,-3.24,-0.894],["H",-2.582,-2.803,0.001],["H",-1.108,-3.239,0.895],["H",4.136,0.737,0.0],["H",2.983,1.766,-0.9],["H",2.983,1.765,0.9],["H",-1.872,3.122,-0.001],["H",-2.996,2.06,0.888],["H",-2.998,2.059,-0.885]],
   bonds:[[0,8,2],[1,9,2],[2,7,1],[2,9,1],[2,11,1],[3,6,1],[3,10,1],[3,12,1],[4,8,1],[4,9,1],[4,13,1],[5,7,1],[5,10,2],[6,7,2],[6,8,1],[10,14,1],[11,15,1],[11,16,1],[11,17,1],[12,18,1],[12,19,1],[12,20,1],[13,21,1],[13,22,1],[13,23,1]]}
];
