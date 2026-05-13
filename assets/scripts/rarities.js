// Language Cheatsheet (in case my clumsy ass forgets)
// color: #HEX               -- set text color instantly
// switch color: #HEX        -- same thing (alias)
// transition color: #HEX    -- smooth 0.4s transition to color
// pulse (fi, hold, fo): #HEX  -- fade IN (fi sec) → hold → fade OUT back to previous
// wait: 1.5                 -- pause 1.5 seconds before next command
// loop { ... }              -- repeat everything inside forever
// -- this is a comment      -- ignored by parser

const rarities = [
  { name: 'SUMMER', chance: 1 / 1000000000000000, style: `
    loop {
      color: #FF0000
      wait: 0.1
      switch color: #FFA500
      wait: 0.1
      switch color: #FFFF00
      wait: 0.1
      switch color: #0000FF
      wait: 0.1
      switch color: #FFC0CB
    }
  ` },
  { name: 'finished.', chance: 1 / 100000000000000, style: `
    color: #FFD700
    loop {
      pulse (2, 3, 2): #FFFFFF
    }
  ` },
  { name: 'pseudopseudohypoparathyroidism', chance: 1 / 10000000000000, style: `
    loop {
      color: #FF6B6B
      wait: 0.06
      color: #6B6BFF
      wait: 0.06
      color: #6BFFB0
      wait: 0.06
      color: #FFD96B
      wait: 0.06
    }
  ` },
  { name: '...', chance: 1 / 10000000000, style: `
    color: #666666
    loop {
      pulse (1.2, 2, 1.2): #111111
    }
  ` },
  { name: 'the world', chance: 1 / 8200000000, style: `
    color: #FFD700
    loop {
      pulse (2, 3, 2): #4488FF
    }
  ` },
  { name: 'Antimatter', chance: 1 / 5000000000, style: `
    color: #9900FF
    loop {
      pulse (0.08, 0.08, 0.08): #220044
      wait: 0.6
    }
  ` },
  { name: 'Dissociation', chance: 1 / 2000000000, style: `
    color: #BBBBBB
    loop {
      pulse (1.5, 2.5, 1.5): #EEEEEE
    }
  ` },
  { name: 'Void', chance: 1 / 1000000000, style: `
    color: #111111
    loop {
      pulse (0.8, 2, 0.8): #000000
    }
  ` },
  { name: 'brother what', chance: 1 / 400000000 },
  { name: 'SCHIZOPHRENIC', chance: 1 / 300000000, style: `
    loop {
      color: #FF3333
      wait: 0.07
      color: #3333FF
      wait: 0.07
      color: #33FF33
      wait: 0.07
      color: #FF33FF
      wait: 0.07
      color: #FFFFFF
      wait: 0.07
    }
  ` },
  { name: 'Multiverse', chance: 1 / 200000000, style: `
    loop {
      transition color: #FF0000
      wait: 0.25
      transition color: #FF8800
      wait: 0.25
      transition color: #FFFF00
      wait: 0.25
      transition color: #00FF88
      wait: 0.25
      transition color: #0088FF
      wait: 0.25
      transition color: #AA00FF
      wait: 0.25
    }
  ` },
  { name: 'Psychosis', chance: 1 / 50000000, style: `
    color: #FF2222
    loop {
      pulse (0.04, 0.06, 0.04): #FF9999
      wait: 0.18
    }
  ` },
  { name: 'Extinction', chance: 1 / 30000000, style: `
    color: #660000
    loop {
      pulse (0.5, 1, 0.5): #000000
    }
  ` },
  { name: 'smoking gun', chance: 1 / 20000000 },
  { name: 'STOP PLAYING', chance: 1 / 10000000, style: `
    loop {
      color: #FF0000
      wait: 0.22
      color: #FFFF00
      wait: 0.22
    }
  ` },
  { name: 'some sort of paranoia', chance: 1 / 8000000, style: `
    color: #00BB00
  ` },
  { name: 'Supermassive', chance: 1 / 5000000, style: `
    color: #220044
    loop {
      pulse (1.2, 2, 1.2): #550099
    }
  ` },
  { name: 'Delusion', chance: 1 / 3000000, style: `
    color: #DD99FF
    loop {
      pulse (1, 1.5, 1): #8822EE
    }
  ` },
  { name: 'Kyawthuite', chance: 1 / 1500000, style: `
    color: #C85A00
    loop {
      pulse (0.7, 1.2, 0.7): #FF9933
    }
  ` },
  { name: 'Globular but better', chance: 1 / 1300000, style: `
    color: #FFD700
    loop {
      pulse (0.4, 0.6, 0.4): #FFFACD
      wait: 0.2
    }
  ` },
  { name: 'Obsession', chance: 1 / 1200000, style: `
    color: #CC0033
    loop {
      pulse (0.25, 0.3, 0.25): #FF0055
      wait: 0.15
    }
  ` },
  { name: 'you shouldnt have', chance: 1 / 1156852, style: `
    color: #FFD700
    loop {
      pulse (0.15, 0.3, 0.15): #FFFFFF
      wait: 0.6
    }
  ` },
  { name: 'francium', chance: 1 / 1100000, style: `
    color: #39FF14
  ` },
  { name: 'Impossible...', chance: 1 / 1000000, style: `
    color: #FFD700
    loop {
      pulse (0.6, 1, 0.6): #FFFFFF
    }
  ` },
  { name: 'Interstellar', chance: 1 / 800000, style: `
    color: #003388
    loop {
      pulse (1, 2, 1): #0055CC
    }
  ` },
  { name: 'Dissociative', chance: 1 / 700000, style: `
    color: #999999
    loop {
      pulse (1, 1.8, 1): #DDDDDD
    }
  ` },
  { name: 'luminal', chance: 1 / 600000, style: `
    color: #CCCCFF
  ` },
  { name: 'Mania', chance: 1 / 500000, style: `
    loop {
      color: #FF00FF
      wait: 0.09
      color: #FFFF00
      wait: 0.09
      color: #00FFFF
      wait: 0.09
      color: #FF8800
      wait: 0.09
    }
  ` },
  { name: 'Gravitational', chance: 1 / 400000, style: `
    color: #000055
    loop {
      pulse (0.7, 1.2, 0.7): #0000BB
    }
  ` },
  { name: 'anxiety...', chance: 1 / 300000, style: `
    color: #FFCC00
  ` },
  { name: 'Cosmic', chance: 1 / 250000, style: `
    color: #5500BB
    loop {
      pulse (0.9, 1.2, 0.9): #AA44FF
    }
  ` },
  { name: 'Neurosis', chance: 1 / 200000, style: `
    color: #887755
    loop {
      pulse (0.4, 0.6, 0.4): #CCBB88
      wait: 0.3
    }
  ` },
  { name: 'Event Horizon', chance: 1 / 101234, style: `
    color: #330000
  ` },
  { name: 'kill me', chance: 1 / 100000, style: `
    loop {
      color: #FF0000
      wait: 0.5
      color: #000000
      wait: 0.5
    }
  ` },
  { name: 'Breakdown', chance: 1 / 95000, style: `
    loop {
      color: #FF3300
      wait: 0.09
      color: #1A0000
      wait: 0.09
      color: #FF6600
      wait: 0.09
      color: #000000
      wait: 0.09
    }
  ` },
  { name: 'just let go already', chance: 1 / 75000, style: `
    color: #1A2A4A
    loop {
      pulse (1.5, 3, 1.5): #2A3A6A
    }
  ` },
  { name: 'Pulsar', chance: 1 / 65000, style: `
    color: #AAAAAA
    loop {
      pulse (0.04, 0.06, 0.04): #FFFFFF
      wait: 0.7
    }
  ` },
  { name: 'panic!', chance: 1 / 55000, style: `
    loop {
      color: #FF4400
      wait: 0.07
      color: #FFDD00
      wait: 0.07
    }
  ` },
  { name: 'Intel', chance: 1 / 50000 },
  { name: 'Nebulous', chance: 1 / 45000 },
  { name: 'anorexia', chance: 1 / 40000 },
  { name: 'Starborn', chance: 1 / 38000 },
  { name: '...whaat', chance: 1 / 35000 },
  { name: 'Disorder', chance: 1 / 33000 },
  { name: 'uh...', chance: 1 / 30000 },
  { name: 'rare rarity :3', chance: 1 / 30000, style: `
    loop {
      color: #FFD1DC
      wait: 1
    }
  ` },
  { name: 'Galactic', chance: 1 / 28000 },
  { name: 'Eventide', chance: 1 / 25000 },
  { name: 'Phobia', chance: 1 / 23000 },
  { name: 'Catatonia', chance: 1 / 20000 },
  { name: 'Astroid', chance: 1 / 19000 },
  { name: 'Quantic', chance: 1 / 18000 },
  { name: 'Bipolar', chance: 1 / 17000 },
  { name: 'Photon', chance: 1 / 16000 },
  { name: 'Redshifted', chance: 1 / 15000 },
  { name: 'cyclothymic', chance: 1 / 14000 },
  { name: 'oh my-', chance: 1 / 13500 },
  { name: 'depressive', chance: 1 / 12900 },
  { name: 'im gonna cry', chance: 1 / 12800 },
  { name: 'dude why', chance: 1 / 12700 },
  { name: 'Kuiper', chance: 1 / 12600 },
  { name: 'Globular', chance: 1 / 12500 },
  { name: 'Elliptical', chance: 1 / 12400 },
  { name: 'Irregular', chance: 1 / 12300 },
  { name: 'Supercluster', chance: 1 / 12200 },
  { name: 'Hyperstar', chance: 1 / 12100 },
  { name: 'Hypernova', chance: 1 / 12000 },
  { name: 'youre him', chance: 1 / 11950 },
  { name: 'Supergiant', chance: 1 / 11900 },
  { name: 'Supervoid', chance: 1 / 11800 },
  { name: 'Superflare but better', chance: 1 / 11700 },
  { name: 'Supercloud but better', chance: 1 / 11600 },
  { name: 'Singularity', chance: 1 / 11500 },
  { name: 'Wormhole', chance: 1 / 11400 },
  { name: 'Blackhole', chance: 1 / 11300 },
  { name: 'Quasar', chance: 1 / 11200 },
  { name: 'Neutron', chance: 1 / 11100 },
  { name: 'Vortex', chance: 1 / 11050 },
  { name: 'Protogalaxy', chance: 1 / 11000 },
  { name: 'Hypervelocity', chance: 1 / 10900 },
  { name: 'Exoplanet', chance: 1 / 10800 },
  { name: 'Planetary', chance: 1 / 10700 },
  { name: 'Perplex', chance: 1 / 10600 },
  { name: 'Protostar', chance: 1 / 10500 },
  { name: 'Circumstellar', chance: 1 / 10400 },
  { name: 'microscopic', chance: 1 / 10350 },
  { name: 'Protoplanetary', chance: 1 / 10300 },
  { name: 'Magnetar', chance: 1 / 10200 },
  { name: 'Stellar', chance: 1 / 10100 },
  { name: 'cat', chance: 1 / 10000 },
  { name: 'Chromosphere', chance: 1 / 9975 },
  { name: 'Rogue', chance: 1 / 9950 },
  { name: 'Lagrange', chance: 1 / 9850 },
  { name: 'erm what', chance: 1 / 9825 },
  { name: 'Perigee', chance: 1 / 9800 },
  { name: 'Apogee', chance: 1 / 9775 },
  { name: 'Ecliptic', chance: 1 / 9750 },
  { name: 'Parsec', chance: 1 / 9725 },
  { name: 'Lightyear', chance: 1 / 9700 },
  { name: 'Astronomical', chance: 1 / 9675 },
  { name: 'Coronal', chance: 1 / 9650 },
  { name: 'Cepheid', chance: 1 / 9625 },
  { name: 'stop', chance: 1 / 9590 },
  { name: 'Luminosity', chance: 1 / 9575 },
  { name: 'Accretion', chance: 1 / 9550 },
  { name: '...?!!', chance: 1 / 9540 },
  { name: 'Bolometric', chance: 1 / 9525 },
  { name: 'Innovation', chance: 1 / 9520 },
  { name: 'Spectroscopy', chance: 1 / 9500 },
  { name: 'Parallax', chance: 1 / 9475 },
  { name: 'Supernova', chance: 1 / 9450 },
  { name: 'Precession', chance: 1 / 9425 },
  { name: 'Nutation', chance: 1 / 9400 },
  { name: 'Libration', chance: 1 / 9375 },
  { name: 'uhmmmm how', chance: 1 / 9350 },
  { name: 'Occultation', chance: 1 / 9325 },
  { name: 'Coronagraph', chance: 1 / 9300 },
  { name: 'Spectrograph', chance: 1 / 9275 },
  { name: 'Neutrino', chance: 1 / 9250 },
  { name: 'Interferometer', chance: 1 / 9225 },
  { name: 'Astrometry', chance: 1 / 9200 },
  { name: 'Photometry', chance: 1 / 9175 },
  { name: 'Meteorite', chance: 1 / 9150 },
  { name: 'Radiometry', chance: 1 / 9125 },
  { name: 'rarity names suck', chance: 1 / 9100 },
  { name: 'Thermodynamic', chance: 1 / 9075 },
  { name: 'Supercloud', chance: 1 / 9050 },
  { name: 'Entropy', chance: 1 / 9025 },
  { name: '// !strict', chance: 1 / 9000 },
  { name: 'Isentropic', chance: 1 / 8975 },
  { name: 'Superflare', chance: 1 / 8950 },
  { name: 'Adiabatic', chance: 1 / 8925 },
  { name: 'Isothermal', chance: 1 / 8900 },
  { name: 'Barotropic', chance: 1 / 8875 },
  { name: 'Planetesimal', chance: 1 / 8850 },
  { name: 'Polytropic', chance: 1 / 8825 },
  { name: 'Euphoria', chance: 1 / 8800 },
  { name: 'Relativistic', chance: 1 / 8775 },
  { name: 'Gamma', chance: 1 / 8750 },
  { name: 'Lorentz', chance: 1 / 8725 },
  { name: 'Minkowski', chance: 1 / 8700 },
  { name: 'Schwarzschild', chance: 1 / 8675 },
  { name: 'Kerr', chance: 1 / 8650 },
  { name: 'Ergosphere', chance: 1 / 8625 },
  { name: 'Dwarf', chance: 1 / 8600 },
  { name: 'Penrose', chance: 1 / 8575 },
  { name: 'Hawking', chance: 1 / 8550 },
  { name: 'Arcane', chance: 1 / 8500 },
  { name: 'Cascade', chance: 1 / 8400 },
  { name: 'Hubble', chance: 1 / 8375 },
  { name: 'Cosmological', chance: 1 / 8350 },
  { name: 'Redshift', chance: 1 / 8325 },
  { name: 'rah?', chance: 1 / 8300 },
  { name: 'Blueshift', chance: 1 / 8275 },
  { name: 'Aberration', chance: 1 / 8225 },
  { name: 'Lucent', chance: 1 / 8200 },
  { name: 'Refraction', chance: 1 / 8175 },
  { name: 'central', chance: 1 / 8170 },
  { name: 'STOP GAMBLING', chance: 1 / 8150 },
  { name: 'Diffraction', chance: 1 / 8125 },
  { name: 'Celestia', chance: 1 / 8100 },
  { name: 'Polarization', chance: 1 / 8075 },
  { name: 'Synchrotron', chance: 1 / 8050 },
  { name: 'Bremsstrahlung', chance: 1 / 8025 },
  { name: 'Seraphic', chance: 1 / 8000 },
  { name: 'Compton', chance: 1 / 7975 },
  { name: 'Photoelectric', chance: 1 / 7950 },
  { name: 'Nucleosynthesis', chance: 1 / 7925 },
  { name: 'Aetherial', chance: 1 / 7900 },
  { name: 'Fusion', chance: 1 / 7875 },
  { name: 'Fission', chance: 1 / 7850 },
  { name: 'Isotope', chance: 1 / 7825 },
  { name: 'Aether', chance: 1 / 7800 },
  { name: 'Deuterium', chance: 1 / 7775 },
  { name: 'Tritium', chance: 1 / 7750 },
  { name: 'Iridial', chance: 1 / 7700 },
  { name: 'Lithium', chance: 1 / 7675 },
  { name: 'Beryllium', chance: 1 / 7650 },
  { name: 'Boron', chance: 1 / 7625 },
  { name: 'Halcyon', chance: 1 / 7600 },
  { name: 'Nitrogen', chance: 1 / 7550 },
  { name: 'Stardrift', chance: 1 / 7500 },
  { name: 'hell', chance: 1 / 7450 },
  { name: 'Sodium', chance: 1 / 7425 },
  { name: 'Moonlit', chance: 1 / 7400 },
  { name: 'Magnesium', chance: 1 / 7375 },
  { name: 'cotton', chance: 1 / 7350, style: `
    color: #FFB6C1
  ` },
  { name: 'Aluminum', chance: 1 / 7325 },
  { name: 'Frame', chance: 1 / 7300 },
  { name: 'Silicon', chance: 1 / 7275 },
  { name: 'Phosphorus', chance: 1 / 7250 },
  { name: 'Sulfur', chance: 1 / 7225 },
  { name: 'Chemical', chance: 1 / 7200 },
  //i should consider making a rarities.ts at this point.. oh and maybe cutscenemap.ts as well.. it'll save like fuckin 700 lines
  { name: 'Chlorine', chance: 1 / 7175 },
  { name: 'Argon', chance: 1 / 7150 },
  { name: 'Potassium', chance: 1 / 7125 },
  { name: 'Script', chance: 1 / 7100 },
  { name: 'Calcium', chance: 1 / 7075 },
  { name: 'Scandium', chance: 1 / 7050 },
  { name: 'Titanium', chance: 1 / 7025 },
  { name: 'go outside lil bro', chance: 1 / 7000 },
  { name: 'Vanadium', chance: 1 / 6975 },
  { name: 'Chromium', chance: 1 / 6950 },
  { name: 'Ruby', chance: 1 / 6935 },
  { name: 'Manganese', chance: 1 / 6925 },
  { name: 'Entertain', chance: 1 / 6900 },
  { name: 'Iron-56', chance: 1 / 6875 },
  { name: 'Nickel', chance: 1 / 6825 },
  { name: 'Prospect', chance: 1 / 6800 },
  { name: 'Copper', chance: 1 / 6775 },
  { name: 'Zinc', chance: 1 / 6750 },
  { name: 'Gallium', chance: 1 / 6725 },
  { name: 'Infamy', chance: 1 / 6700 },
  { name: 'Germanium', chance: 1 / 6675 },
  { name: 'Arsenic', chance: 1 / 6650 },
  { name: 'Selenium', chance: 1 / 6625 },
  { name: 'Rust', chance: 1 / 6600 },
  { name: 'Bromine', chance: 1 / 6575 },
  { name: 'Krypton', chance: 1 / 6550 },
  { name: 'Rubidium', chance: 1 / 6525 },
  { name: 'Low', chance: 1 / 6500 },
  { name: 'Strontium', chance: 1 / 6475 },
  { name: 'Yttrium', chance: 1 / 6450 },
  { name: 'Zirconium', chance: 1 / 6425 },
  { name: 'Toggle', chance: 1 / 6400 },
  { name: 'Niobium', chance: 1 / 6375 },
  { name: 'Molybdenum', chance: 1 / 6350 },
  { name: 'Technetium', chance: 1 / 6325 },
  { name: 'Doppler', chance: 1 / 6300 },
  { name: 'Ruthenium', chance: 1 / 6275 },
  { name: 'Rhodium', chance: 1 / 6250 },
  { name: 'Palladium', chance: 1 / 6225 },
  { name: 'Carpal', chance: 1 / 6200 },
  { name: 'Silver', chance: 1 / 6175 },
  { name: 'Cadmium', chance: 1 / 6150 },
  { name: 'Indium', chance: 1 / 6125 },
  { name: 'Interfere', chance: 1 / 6100 },
  { name: 'Tin', chance: 1 / 6075 },
  { name: 'cloudy', chance: 1 / 6050 },
  { name: 'Antimony', chance: 1 / 6025 },
  { name: 'Intermission', chance: 1 / 6000 },
  { name: 'Tellurium', chance: 1 / 5975 },
  { name: 'Iodine', chance: 1 / 5950 },
  { name: 'Xenon', chance: 1 / 5925 },
  { name: 'Alternate', chance: 1 / 5900 },
  { name: 'Cesium', chance: 1 / 5875 },
  { name: 'SyntaxError', chance: 1 / 5850 },
  { name: 'Barium', chance: 1 / 5825 },
  { name: 'Subzero', chance: 1 / 5800 },
  { name: 'Lanthanum', chance: 1 / 5775 },
  { name: 'Cerium', chance: 1 / 5750 },
  { name: 'Praseodymium', chance: 1 / 5725 },
  { name: 'Automatic', chance: 1 / 5700 },
  { name: 'Neodymium', chance: 1 / 5675 },
  { name: 'Promethium', chance: 1 / 5650 },
  { name: 'Samarium', chance: 1 / 5625 },
  { name: 'Encount', chance: 1 / 5600 },
  { name: 'Europium', chance: 1 / 5575 },
  { name: '🦶', chance: 1 / 5550 },
  { name: 'Gadolinium', chance: 1 / 5525 },
  { name: 'Telepath', chance: 1 / 5500 },
  { name: 'Terbium', chance: 1 / 5475 },
  { name: 'Dysprosium', chance: 1 / 5450 },
  { name: 'Holmium', chance: 1 / 5425 },
  { name: 'Airborne', chance: 1 / 5400 },
  { name: 'Erbium', chance: 1 / 5375 },
  { name: 'Thulium', chance: 1 / 5350 },
  { name: 'Ytterbium', chance: 1 / 5325 },
  { name: 'Viking', chance: 1 / 5300 },
  { name: 'Lutetium', chance: 1 / 5275 },
  { name: 'Hafnium', chance: 1 / 5250 },
  { name: 'Tantalum', chance: 1 / 5225 },
  { name: 'Wraith', chance: 1 / 5200 },
  { name: 'Tungsten', chance: 1 / 5175 },
  { name: 'Rhenium', chance: 1 / 5150 },
  { name: 'Osmium', chance: 1 / 5125 },
  { name: 'Spectral', chance: 1 / 5100 },
  { name: 'Iridium', chance: 1 / 5075 },
  { name: 'Platinum', chance: 1 / 5050 },
  { name: 'Polonium', chance: 1 / 5025 },
  { name: 'Nebula', chance: 1 / 5000 },
  { name: 'Radon', chance: 1 / 4975 },
  { name: 'Radium', chance: 1 / 4950 },
  { name: 'Actinium', chance: 1 / 4925 },
  { name: 'Vesper', chance: 1 / 4900 },
  { name: 'Thorium', chance: 1 / 4875 },
  { name: 'Protactinium', chance: 1 / 4850 },
  { name: 'Uranium', chance: 1 / 4825 },
  { name: 'Command', chance: 1 / 4800 },
  { name: 'Neptunium', chance: 1 / 4775 },
  { name: 'Plutonium', chance: 1 / 4750 },
  { name: 'Americium', chance: 1 / 4725 },
  { name: 'Quell', chance: 1 / 4700 },
  { name: 'Curium', chance: 1 / 4675 },
  { name: 'Berkelium', chance: 1 / 4650 },
  { name: 'Californium', chance: 1 / 4625 },
  { name: 'Unravel', chance: 1 / 4600 },
  { name: 'Einsteinium', chance: 1 / 4575 },
  { name: 'Fermium', chance: 1 / 4550 },
  { name: 'Mendelevium', chance: 1 / 4525 },
  { name: 'Decimate', chance: 1 / 4500 },
  { name: 'Nobelium', chance: 1 / 4475 },
  { name: 'Lawrencium', chance: 1 / 4450 },
  { name: 'Rutherfordium', chance: 1 / 4425 },
  { name: 'Comet', chance: 1 / 4400 },
  { name: 'Dubnium', chance: 1 / 4375 },
  { name: 'Seaborgium', chance: 1 / 4350 },
  { name: 'Bohrium', chance: 1 / 4325 },
  { name: 'Melancholy', chance: 1 / 4300 },
  { name: 'Hassium', chance: 1 / 4275 },
  { name: 'Meitnerium', chance: 1 / 4250 },
  { name: 'Darmstadtium', chance: 1 / 4225 },
  { name: 'Asteroid', chance: 1 / 4200 },
  { name: 'Roentgenium', chance: 1 / 4175 },
  { name: 'Copernicium', chance: 1 / 4150 },
  { name: 'Nihonium', chance: 1 / 4125 },
  { name: 'Radiation', chance: 1 / 4100 },
  { name: 'Flerovium', chance: 1 / 4075 },
  { name: 'Moscovium', chance: 1 / 4050 },
  { name: 'Livermorium', chance: 1 / 4025 },
  { name: 'Escensia', chance: 1 / 4000 },
  { name: 'Tennessine', chance: 1 / 3975 },
  { name: 'Oganesson', chance: 1 / 3950 },
  { name: 'Ionosphere', chance: 1 / 3925 },
  { name: 'Supermoon', chance: 1 / 3900 },
  { name: 'Mesosphere', chance: 1 / 3875 },
  { name: 'Stratosphere', chance: 1 / 3850 },
  { name: 'Troposphere', chance: 1 / 3825 },
  { name: 'Anxious', chance: 1 / 3800 },
  { name: 'Exosphere', chance: 1 / 3775 },
  { name: 'Thermosphere', chance: 1 / 3750 },
  { name: 'Magnetosphere', chance: 1 / 3725 },
  { name: 'Dreamless', chance: 1 / 3700 },
  { name: 'Heliosphere', chance: 1 / 3675 },
  { name: 'Plasmasphere', chance: 1 / 3650 },
  { name: 'Photosphere', chance: 1 / 3625 },
  { name: 'Wanderer', chance: 1 / 3600 },
  { name: 'Radiative', chance: 1 / 3575 },
  { name: 'Convective', chance: 1 / 3550 },
  { name: 'Tachocline', chance: 1 / 3525 },
  { name: 'Corpulence', chance: 1 / 3500 },
  { name: 'Nucleon', chance: 1 / 3475 },
  { name: 'Solutions', chance: 1 / 3450 },
  { name: 'Proton', chance: 1 / 3425 },
  { name: 'ok bro', chance: 1 / 3410 },
  { name: 'Points', chance: 1 / 3400 },
  { name: 'Electron', chance: 1 / 3375 },
  { name: 'just stop', chance: 1 / 3350 },
  { name: 'Positron', chance: 1 / 3325 },
  { name: 'Abandoned', chance: 1 / 3300 },
  { name: 'Antiproton', chance: 1 / 3275 },
  { name: 'Vertical', chance: 1 / 3250 },
  { name: 'Antineutron', chance: 1 / 3225 },
  { name: 'touch grass bro', chance: 1 / 3200 },
  { name: 'Muon', chance: 1 / 3175 },
  { name: 'Null', chance: 1 / 3170 },
  { name: 'Spectrum', chance: 1 / 3150 },
  { name: 'Tau', chance: 1 / 3145 },
  { name: 'deja vu', chance: 1 / 3128 },
  { name: 'Pioneer', chance: 1 / 3115 },
  { name: 'Perplexed', chance: 1 / 3100 },
  { name: 'Kaon', chance: 1 / 3085 },
  { name: 'Meson', chance: 1 / 3070 },
  { name: 'Zenith', chance: 1 / 3050 },
  { name: 'The End?', chance: 1 / 3000 },
  { name: 'Fermion', chance: 1 / 2990 },
  { name: 'Spectra', chance: 1 / 2978 },
  { name: 'Boson', chance: 1 / 2965 },
  { name: 'Poltergeist', chance: 1 / 2950 },
  { name: 'Gluon', chance: 1 / 2940 },
  { name: 'Graviton', chance: 1 / 2925 },
  { name: 'MURDER', chance: 1 / 2900 },
  { name: 'Quark', chance: 1 / 2875 },
  { name: 'Pixelated', chance: 1 / 2850 },
  { name: 'Charm', chance: 1 / 2840 },
  { name: 'Strange', chance: 1 / 2825 },
  { name: 'Nightmare', chance: 1 / 2800 },
  { name: 'Bottom', chance: 1 / 2790 },
  { name: 'Top', chance: 1 / 2775 },
  { name: 'Prophetic', chance: 1 / 2750 },
  { name: 'Upsilon', chance: 1 / 2740 },
  { name: 'Omega', chance: 1 / 2725 },
  { name: 'Lambda', chance: 1 / 2710 },
  { name: 'Delta', chance: 1 / 2665 },
  { name: 'Desire', chance: 1 / 2650 },
  { name: 'Experience', chance: 1 / 2637 },
  { name: 'Daydream', chance: 1 / 2600 },
  { name: 'Alpha', chance: 1 / 2560 },
  { name: 'bridged', chance: 1 / 2550 },
  { name: 'Peripherals', chance: 1 / 2500 },
  { name: 'kappa', chance: 1 / 2490 },
  { name: 'Micro', chance: 1 / 2450 },
  { name: 'Terminal', chance: 1 / 2400 },
  { name: 'pale', chance: 1 / 2390 },
  { name: 'Overload', chance: 1 / 2360 },
  { name: 'Equinox', chance: 1 / 2300 },
  { name: 'Thoughts', chance: 1 / 2250 },
  { name: 'Coherence', chance: 1 / 2200 },
  { name: 'Verbose', chance: 1 / 2150 },
  { name: 'Pillars', chance: 1 / 2140 },
  { name: 'horsehead hahahaha', chance: 1 / 2125 },
  { name: 'Solstice', chance: 1 / 2100 },
  { name: 'Orion', chance: 1 / 2090 },
  { name: 'Crab', chance: 1 / 2075 },
  { name: 'Paralysis', chance: 1 / 2050 },
  { name: 'Veil', chance: 1 / 2040 },
  { name: 'Ring', chance: 1 / 2025 },
  { name: 'Paradox', chance: 1 / 2000 },
  { name: 'Helix', chance: 1 / 1990 },
  { name: 'Dumbbell', chance: 1 / 1975 },
  { name: 'Duration', chance: 1 / 1950 },
  { name: 'Owl', chance: 1 / 1940 },
  { name: 'Butterfly', chance: 1 / 1925 },
  { name: 'Despair', chance: 1 / 1900 },
  { name: 'Eskimo', chance: 1 / 1890 },
  { name: 'Lagoon', chance: 1 / 1875 },
  { name: 'funny haha', chance: 1 / 1870 },
  { name: 'Wildfire', chance: 1 / 1854 },
  { name: 'Trifid', chance: 1 / 1840 },
  { name: 'Eagle', chance: 1 / 1825 },
  { name: 'Insanity', chance: 1 / 1800 },
  { name: 'Rosette', chance: 1 / 1790 },
  { name: 'Purpose', chance: 1 / 1750 },
  { name: 'Pelican', chance: 1 / 1725 },
  { name: 'Lunarity', chance: 1 / 1700 },
  { name: 'Swan', chance: 1 / 1690 },
  { name: 'California', chance: 1 / 1675 },
  { name: 'Twilight', chance: 1 / 1650 },
  { name: 'Cone', chance: 1 / 1640 },
  { name: 'Iris', chance: 1 / 1625 },
  { name: 'Constellation', chance: 1 / 1600 },
  { name: 'still playing?', chance: 1 / 1590 },
  { name: 'Jellyfish', chance: 1 / 1575 },
  { name: 'Gold', chance: 1 / 1570 },
  { name: 'wowie', chance: 1 / 1570 },
  { name: 'Heart', chance: 1 / 1560 },
  { name: 'Soul', chance: 1 / 1555 },
  { name: 'Aperture', chance: 1 / 1550 },
  { name: 'Eclipse', chance: 1 / 1500 },
  { name: 'Flame', chance: 1 / 1490 },
  { name: 'Tarantula', chance: 1 / 1475 },
  { name: '<>', chance: 1 / 1466 },
  { name: 'Keyhole', chance: 1 / 1455 },
  { name: 'Inferno', chance: 1 / 1444 },
  { name: 'Carina', chance: 1 / 1430 },
  { name: 'Tempered', chance: 1 / 1425 },
  { name: 'Documented', chance: 1 / 1410 },
  { name: 'Matrix', chance: 1 / 1405 },
  { name: 'Grayscale', chance: 1 / 1400 },
  { name: 'Homunculus', chance: 1 / 1390 },
  { name: 'Garden', chance: 1 / 1380 },
  { name: 'Constant', chance: 1 / 1350 },
  { name: 'Trapezium', chance: 1 / 1335 },
  { name: 'Access', chance: 1 / 1320 },
  { name: 'Betelgeuse', chance: 1 / 1310 },
  { name: 'Gladiator', chance: 1 / 1300 },
  { name: 'Rigel', chance: 1 / 1285 },
  { name: 'Sirius', chance: 1 / 1270 },
  { name: 'Amethyst', chance: 1 / 1260 },
  { name: 'Blink', chance: 1 / 1245 },
  { name: 'Cobalt', chance: 1 / 1230 },
  { name: 'Procyon', chance: 1 / 1215 },
  { name: 'Terrifying', chance: 1 / 1200 },
  { name: 'Aldebaran', chance: 1 / 1190 },
  { name: 'Heliocentric', chance: 1 / 1175 },
  { name: 'Antares', chance: 1 / 1160 },
  { name: 'Arcturus', chance: 1 / 1140 },
  { name: 'Vega', chance: 1 / 1125 },
  { name: 'anyone there?', chance: 1 / 1100 },
  { name: 'Capella', chance: 1 / 1090 },
  { name: 'Stressed', chance: 1 / 1075 },
  { name: 'Pollux', chance: 1 / 1060 },
  { name: 'Divine', chance: 1 / 1050 },
  { name: 'Fomalhaut', chance: 1 / 1035 },
  { name: 'Meteor', chance: 1 / 1025 },
  { name: 'Deneb', chance: 1 / 1010 },
  { name: 'Lunar', chance: 1 / 1000, style: `
    color: #7340ad
  `},
  { name: 'Regulus', chance: 1 / 990 },
  { name: 'Hopeless', chance: 1 / 975 },
  { name: 'Altair', chance: 1 / 960 },
  { name: 'Appalled', chance: 1 / 950 },
  { name: 'Spica', chance: 1 / 935 },
  { name: 'Dreamy', chance: 1 / 930 },
  { name: 'Index', chance: 1 / 915 },
  { name: 'Catastropic', chance: 1 / 900 },
  { name: 'Achernar', chance: 1 / 885 },
  { name: 'Gravity', chance: 1 / 865 },
  { name: 'Hadar', chance: 1 / 850 },
  { name: 'Equations', chance: 1 / 830 },
  { name: 'Canopus', chance: 1 / 815 },
  { name: 'Tidal', chance: 1 / 800 },
  { name: 'Lucky', chance: 1 / 777 },
  { name: 'Starlight', chance: 1 / 750 },
  { name: 'Proxima', chance: 1 / 735 },
  { name: 'IO', chance: 1 / 720 },
  { name: 'Merciful', chance: 1 / 700 },
  { name: 'Worried', chance: 1 / 675 },
  { name: 'the spooky', chance: 1 / 666 },
  { name: 'Process', chance: 1 / 650 },
  { name: 'Celestial', chance: 1 / 625 },
  { name: 'Divinity', chance: 1 / 600 },
  { name: 'Lonely', chance: 1 / 575 },
  { name: 'Storm', chance: 1 / 550 },
  { name: 'Cosmos', chance: 1 / 535 },
  { name: 'Glass', chance: 1 / 520 },
  { name: 'Lazer', chance: 1 / 500 },
  { name: 'Jetdroid', chance: 1 / 475 },
  { name: 'Prism', chance: 1 / 450 },
  { name: 'Ultra', chance: 1 / 430 },
  { name: 'Astral', chance: 1 / 400 },
  { name: 'Fearful', chance: 1 / 375 },
  { name: 'Orbit', chance: 1 / 350 },
  { name: 'Solar', chance: 1 / 325 },
  { name: 'Chroma', chance: 1 / 300 },
  { name: 'Guilty', chance: 1 / 275 },
  { name: 'Theory', chance: 1 / 250 },
  { name: 'heartstruck', chance: 1 / 230 },
  { name: 'Crazy', chance: 1 / 200 },
  { name: 'Saturn', chance: 1 / 185 },
  { name: 'Lapis', chance: 1 / 170 },
  { name: 'Fabled', chance: 1 / 150 },
  { name: 'Troubled', chance: 1 / 135 },
  { name: 'Superior', chance: 1 / 120 },
  { name: 'Jupiter', chance: 1 / 110 },
  { name: 'Rainbow', chance: 1 / 100 },
  { name: 'meh', chance: 1 / 95 },
  { name: 'Distorted', chance: 1 / 90 },
  { name: 'windy', chance: 1 / 86 },
  { name: 'sandy', chance: 1 / 82 },
  { name: 'Hardcore', chance: 1 / 80 },
  { name: 'Berry', chance: 1 / 75 },
  { name: 'Lucid', chance: 1 / 72 },
  { name: 'Legendary', chance: 1 / 70 },
  { name: 'Mars', chance: 1 / 65 },
  { name: 'Neon', chance: 1 / 60 },
  { name: 'Comfort', chance: 1 / 55 },
  { name: 'Amazing', chance: 1 / 50 },
  { name: 'Voltage', chance: 1 / 47 },
  { name: 'skill issue', chance: 1 / 46 },
  { name: 'Epic', chance: 1 / 45 },
  { name: 'Venus', chance: 1 / 40 },
  { name: 'Formula', chance: 1 / 37 },
  { name: 'Rare', chance: 1 / 35 },
  { name: 'Apple', chance: 1 / 33 },
  { name: 'Good', chance: 1 / 30 },
  { name: 'Mercury', chance: 1 / 26 },
  { name: 'Cherry', chance: 1 / 23 },
  { name: 'Decent', chance: 1 / 20 },
  { name: 'Tired', chance: 1 / 15 },
  { name: 'Cool', chance: 1 / 10 },
  { name: 'roll more CMON', chance: 1 / 9 },
  { name: 'Blown', chance: 1 / 7 },
  { name: 'Garbage', chance: 1 / 5 },
  { name: 'Uncommon', chance: 1 / 4 },
  { name: 'Common', chance: 1 / 2 },
];

// Cutscene mapping... god this part is messy as fuck lmao
const cutsceneMap = {
  cat: 'assets/videos/cat.mp4',
  SUMMER: 'assets/videos/SUMMER.mp4',
  Points: 'assets/videos/averagecutscene1.mp4',
  Electron: 'assets/videos/averagecutscene1.mp4',
  Positron: 'assets/videos/averagecutscene1.mp4',
  Promethium: 'assets/videos/averagecutscene1.mp4',
  Neodymium: 'assets/videos/averagecutscene1.mp4',
  Automatic: 'assets/videos/averagecutscene1.mp4',
  Praseodymium: 'assets/videos/averagecutscene1.mp4',
  Cerium: 'assets/videos/averagecutscene1.mp4',
  Lanthanum: 'assets/videos/averagecutscene1.mp4',
  Subzero: 'assets/videos/averagecutscene1.mp4',
  Barium: 'assets/videos/averagecutscene1.mp4',
  SyntaxError: 'assets/videos/averagecutscene1.mp4',
  Cesium: 'assets/videos/averagecutscene1.mp4',
  Alternate: 'assets/videos/averagecutscene1.mp4',
  Titanium: 'assets/videos/averagecutscene1.mp4',
  Scandium: 'assets/videos/averagecutscene1.mp4',
  Calcium: 'assets/videos/averagecutscene1.mp4',
  Script: 'assets/videos/averagecutscene1.mp4',
};
