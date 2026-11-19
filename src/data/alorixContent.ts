import { resolveAssetUrl } from '../utils/apiBase';

export const COMPANY_LOGO_URL = resolveAssetUrl(
  'assets/aistudio/Pasted_18-11-2026_at_08.44.33_3180d970.png'
);

export const FOUNDER_IMAGE_URL = resolveAssetUrl(
  'assets/aistudio/915007136_2602807203571226_6069417397992726190_n._8e4bf69d.jpeg'
);

export const FOUNDER_PROFILE = {
  sectionLabel: 'About the Founder',
  name: 'Mithil Shekharan',
  role: 'Founder',
  paragraphs: [
    'Mithil Shekharan is an ambitious young entrepreneur driven by a vision to build a successful and globally recognised business. With a strong interest in entrepreneurship, international trade and business development, he believes in creating opportunities through innovation, dedication and strategic thinking.',
    'As the founder of ALORIX GLOBAL INTERNATIONAL, he aims to establish a company that represents professionalism, transparency and excellence. His vision is to develop meaningful business connections, explore opportunities across different industries and build long-term relationships based on trust and mutual growth.',
    'Guided by a forward-thinking mindset and a commitment to continuous development, Mithil aspires to take the company towards a promising international future.',
  ],
};

export const TECH_TEAM_IMAGE_URL = resolveAssetUrl(
  'assets/aistudio/1234_4d2bcc88.jpeg'
);

export interface TechTeamCapability {
  index: string;
  title: string;
  description: string;
}

export const TECH_TEAM_PROFILE = {
  sectionLabel: 'Tech Team · Digital & Security Partner',
  brandName: 'Shashi Tech',
  tagline: 'Code. Create. Conquer.',
  leadName: 'Shashi Shekhar Singh',
  leadRole: 'Developer, Ethical Hacker & Author',
  roleSummary: 'Technology Partner · Software, AI & Cybersecurity',
  location: 'India',
  paragraphs: [
    'Powering the digital architecture, web engineering, and security resilience of ALORIX GLOBAL INTERNATIONAL is Shashi Tech—an independent technology venture founded by developer, app creator, ethical hacker, and published author Shashi Shekhar Singh.',
    'Driven by the motto "Code. Create. Conquer.", Shashi Tech builds modern web applications, JavaScript digital tools, and intelligent AI solutions including Shashi Intelligence (Calyx AI), alongside quantitative market analysis and trading strategy automation.',
    'Combining disciplined penetration testing and network security practices with technical authorship—including the coding guide Few Steps Toward Coding Partner—Shashi Tech ensures Alorix’s global trade platform remains fast, secure, and engineered for international growth.',
  ],
  capabilities: [
    {
      index: '01',
      title: 'Web & App Architecture',
      description:
        'Full-stack digital platforms, interactive JavaScript web applications, and clean user-centric interfaces engineered for speed and commercial clarity.',
    },
    {
      index: '02',
      title: 'Shashi Intelligence & Calyx AI',
      description:
        'Applied artificial intelligence development centered on Calyx AI—creating smart digital assistants and automated tooling for everyday operations.',
    },
    {
      index: '03',
      title: 'Ethical Hacking & Cyber Defense',
      description:
        'Proactive network reconnaissance, web vulnerability auditing, and defensive architecture safeguarding trade portals and digital workflows.',
    },
    {
      index: '04',
      title: 'Authorship, Quant R&D & Studio',
      description:
        'Author of Few Steps Toward Coding Partner, builder of algorithmic market tools, Python technical educator, and creator at ShashiTech-Studio.',
    },
  ] as TechTeamCapability[],
  initiatives: [
    {
      label: 'Shashi Tech Portfolio',
      url: 'https://shashitech.netlify.app/',
    },
    {
      label: 'Calyx AI',
      url: 'https://calyxai.netlify.app/',
    },
    {
      label: 'GitHub',
      url: 'https://github.com/Shashitech-official',
    },
    {
      label: 'Tech Blog',
      url: 'https://shashi2028.blogspot.com/',
    },
  ],
};

export const PORTFOLIO_IMAGES = {
  aboutLab: resolveAssetUrl('src/assets/images/about_chemical_lab_1795052496824.jpg'),
  industrialSupply: resolveAssetUrl('src/assets/images/portfolio_industrial_supply_1795052496750.jpg'),
  specialtyReagents: resolveAssetUrl('src/assets/images/portfolio_specialty_reagents_1795052497773.jpg'),
  pharmaCleanroom: resolveAssetUrl('src/assets/images/industry_pharma_cleanroom_1795052498217.jpg'),
  globalLogistics: resolveAssetUrl('src/assets/images/industry_global_logistics_1795052498850.jpg'),
  bgHeroSanctuary: resolveAssetUrl('src/assets/images/bg_hero_chemical_sanctuary_1795053239873.jpg'),
  bgAboutGlass: resolveAssetUrl('src/assets/images/bg_about_molecular_glass_1795053239173.jpg'),
  bgPortfolioMist: resolveAssetUrl('src/assets/images/bg_portfolio_refinery_mist_1795053240510.jpg'),
  bgGlobalMaritime: resolveAssetUrl('src/assets/images/bg_global_maritime_night_1795053240567.jpg'),
  productCoalCarbon: resolveAssetUrl(
    'src/assets/images/product_activated_carbon_1795057775497.jpg'
  ),
  productCoconutCarbon: resolveAssetUrl(
    'src/assets/images/real_coconut_carbon_1795058175661.jpg'
  ),
  productGac1240: resolveAssetUrl('src/assets/images/real_gac_1240_1795058175831.jpg'),
  productGranularGac: resolveAssetUrl('src/assets/images/real_granular_gac_1795058175373.jpg'),
  productCharcoalPowder: resolveAssetUrl(
    'src/assets/images/real_charcoal_powder_1795058176239.jpg'
  ),
  productRawCoconutShell: resolveAssetUrl(
    'src/assets/images/real_raw_coconut_shell_1795058176041.jpg'
  ),
  productAnthraciteCoal: resolveAssetUrl(
    'src/assets/images/real_anthracite_coal_1795058175792.jpg'
  ),
  productManganeseDioxide: resolveAssetUrl(
    'src/assets/images/real_manganese_dioxide_1795058176037.jpg'
  ),
  productSlowPotash: resolveAssetUrl('src/assets/images/real_slow_potash_1795058175720.jpg'),
  productCarbonBlack: resolveAssetUrl('src/assets/images/real_carbon_black_1795058177304.jpg'),
  productMolecularSieve: resolveAssetUrl(
    'src/assets/images/product_molecular_sieve_1795057777310.jpg'
  ),
  productTannicAcid: resolveAssetUrl('src/assets/images/real_tannic_acid_1795058175991.jpg'),
  productRedOxide: resolveAssetUrl('src/assets/images/real_red_oxide_1795058175899.jpg'),
  productRoMembranes: resolveAssetUrl(
    'src/assets/images/real_ro_membranes_1795058175636.jpg'
  ),
  productSolarWtp: resolveAssetUrl('src/assets/images/real_solar_wtp_1795058175579.jpg'),
  productPipeEarthing: resolveAssetUrl(
    'src/assets/images/real_pipe_earthing_1795058175832.jpg'
  ),
  productFlowerPots: resolveAssetUrl(
    'src/assets/images/real_flower_pots_1795058591428.jpg'
  ),
} as const;

export type ProductFilterGroup =
  | 'all'
  | 'activated-carbon'
  | 'filtration-minerals'
  | 'specialty-chemicals'
  | 'systems-earthing';

export type PackagingFilterGroup = ProductFilterGroup;

export interface ChemicalCategory {
  id: string;
  index: string;
  title: string;
  familyLabel: string;
  formatGroup: Exclude<ProductFilterGroup, 'all'>;
  shortDescription: string;
  overview: string;
  applications: string[];
  image: string;
  imageAlt: string;
  editableFields: {
    sourcingScope: string;
    packagingPlaceholder: string;
    documentationNote: string;
  };
}

export const CHEMICAL_CATEGORIES: ChemicalCategory[] = [
  {
    id: 'coal-activated-carbon',
    index: '01',
    title: 'Coal-Based Activated Carbon',
    familyLabel: 'Activated Carbon & Charcoal',
    formatGroup: 'activated-carbon',
    shortDescription:
      'Granular and large-particle bituminous coal activated carbon engineered for industrial effluent treatment, decolorization, and heavy contaminant adsorption.',
    overview:
      'High-mechanical-strength coal-based activated carbon offering broad mesopore and macropore distribution. Ideally suited for industrial wastewater treatment, liquid-phase purification, and continuous column beds requiring low pressure drop.',
    applications: [
      'Industrial Effluent & Wastewater Treatment',
      'Municipal Potable Water Filtration',
      'Process Decolorization & Organic Removal',
    ],
    image: PORTFOLIO_IMAGES.productCoalCarbon,
    imageAlt:
      'Granular and extruded bituminous coal-based activated carbon pellets in stainless steel tray',
    editableFields: {
      sourcingScope: 'Granular & Large Particle Grades · Bulk & Containerized',
      packagingPlaceholder: '25 kg / 50 kg Moisture-Barrier Sacks & 500 kg Jumbo Bags',
      documentationNote:
        'Batch iodine value, ash content, and moisture COA supplied per shipment.',
    },
  },
  {
    id: 'coconut-shell-activated-carbon',
    index: '02',
    title: 'Coconut Shell Activated Carbon',
    familyLabel: 'Activated Carbon & Charcoal',
    formatGroup: 'activated-carbon',
    shortDescription:
      'High-purity microporous coconut shell carbon (including 8/16 mesh grades) formulated for dechlorination, potable water, and air odor control.',
    overview:
      'Manufactured from selected dense coconut shells through controlled steam activation. High hardness and dense microporous structure make it the benchmark media for taste, odor, free chlorine, and trace VOC removal.',
    applications: [
      'RO Pre-Filtration & Potable Water Dechlorination',
      'Air Purification & VOC Adsorption',
      'Beverage & Pharmaceutical Polishing',
    ],
    image: PORTFOLIO_IMAGES.productCoconutCarbon,
    imageAlt:
      'Crushed 8x16 mesh coconut shell activated carbon granules beside raw coconut shell halves in inspection tray',
    editableFields: {
      sourcingScope: '8/16 Mesh, 4/8 Mesh & Custom Screening',
      packagingPlaceholder: '25 kg HDPE Lined Bags & 500 kg FIBC Jumbo Bags',
      documentationNote:
        'Supplied with sieve analysis, iodine number, and hardness certification.',
    },
  },
  {
    id: 'gac-1240-norit',
    index: '03',
    title: 'GAC 1240 (Norit Grade)',
    familyLabel: 'Activated Carbon & Charcoal',
    formatGroup: 'activated-carbon',
    shortDescription:
      'Acid-washed coal-based granular activated carbon featuring ~950 mg/g iodine value, ~98% hardness, and low ash for high-purity water treatment.',
    overview:
      'Precision-screened 12x40 mesh granular activated carbon engineered for high adsorption kinetics, low extractable ash, and extended run cycles in drinking water plants and municipal polishing filters.',
    applications: [
      'Municipal Drinking Water Plants',
      'Trace Organics & Micropollutant Removal',
      'Industrial High-Purity Process Streams',
    ],
    image: PORTFOLIO_IMAGES.productGac1240,
    imageAlt:
      'Precision 12x40 mesh granular activated carbon grains on white laboratory dish with steel scoop',
    editableFields: {
      sourcingScope: '12x40 Mesh · Iodine ~950 mg/g · Hardness ~98%',
      packagingPlaceholder: '25 kg Sealed Multi-Wall Sacks & Palletized Lots',
      documentationNote:
        'Full analytical COA including apparent density and backwash metrics.',
    },
  },
  {
    id: 'granular-activated-carbon',
    index: '04',
    title: 'Granular Activated Carbon (GAC)',
    familyLabel: 'Activated Carbon & Charcoal',
    formatGroup: 'activated-carbon',
    shortDescription:
      'Versatile industrial GAC grades calibrated to 0.45–0.55 g/cm³ apparent density for continuous fixed-bed liquid and vapor purification.',
    overview:
      'Uniform granular activated carbon balanced for rapid adsorption capacity and minimal attrition loss during hydraulic backwashing in commercial pressure filters.',
    applications: [
      'Commercial Water Softening & Filtration Beds',
      'Industrial Gas Scrubbing & Odor Control',
      'Effluent Polishing & Reuse Loops',
    ],
    image: PORTFOLIO_IMAGES.productGranularGac,
    imageAlt:
      'Opened bulk polypropylene woven export sack filled with screened granular activated carbon on warehouse pallet',
    editableFields: {
      sourcingScope: '0.45–0.55 g/cm³ Apparent Density · Custom Mesh',
      packagingPlaceholder: '25 kg / 50 kg Sacks & Bulk Jumbo Containers',
      documentationNote:
        'Mesh distribution and adsorption specifications issued per batch.',
    },
  },
  {
    id: 'coconut-shell-charcoal-powder',
    index: '05',
    title: 'Coconut Shell Charcoal Powder',
    familyLabel: 'Activated Carbon & Charcoal',
    formatGroup: 'activated-carbon',
    shortDescription:
      'Finely milled biodegradable coconut shell charcoal powder featuring low moisture and controlled micron fineness for industrial and filtration blends.',
    overview:
      'Processed from clean carbonized coconut shell char and pulverized to uniform powder grades. Ideal for briquetting, specialty chemical compounding, purification slurries, and metallurgy.',
    applications: [
      'Slurry Filtration & Chemical Compounding',
      'Metallurgical Flux & Reduction Blends',
      'Biodegradable Carbon Feedstock',
    ],
    image: PORTFOLIO_IMAGES.productCharcoalPowder,
    imageAlt:
      'Fine matte black coconut shell charcoal powder inside white porcelain mortar with steel spatula',
    editableFields: {
      sourcingScope: 'Fine Micron Screened Powder · Low Moisture (<5%)',
      packagingPlaceholder: '25 kg Lined PP Bags & Export Pallets',
      documentationNote:
        'Particle size mesh certificate and moisture test provided at dispatch.',
    },
  },
  {
    id: 'raw-dense-coconut-shell',
    index: '06',
    title: 'Raw & Dense Coconut Shell',
    familyLabel: 'Activated Carbon & Charcoal',
    formatGroup: 'activated-carbon',
    shortDescription:
      'Clean, sun-dried mature raw and dense brown coconut shell feedstock sorted for carbonization, thermal activation, and industrial processing.',
    overview:
      'High-density raw and dense brown coconut shells free from excessive fiber and soil contamination, delivering high fixed-carbon yield for downstream activation kilns.',
    applications: [
      'Activated Carbon & Charcoal Manufacturing',
      'Industrial Bio-Carbonization Feedstock',
      'Specialty Abrasive & Filler Production',
    ],
    image: PORTFOLIO_IMAGES.productRawCoconutShell,
    imageAlt:
      'Sun-dried dense brown coconut shells sorted in jute and woven export sacks',
    editableFields: {
      sourcingScope: 'Whole & Crushed Dense Shell · Screened Feedstock',
      packagingPlaceholder: '50 kg Bags, 1000 kg Jumbo Sacks & FCL Container Loads',
      documentationNote:
        'Moisture inspection and phytosanitary export paperwork coordinated.',
    },
  },
  {
    id: 'anthracite-coal-media',
    index: '07',
    title: 'Anthracite Coal Filter Media',
    familyLabel: 'Filtration Media & Minerals',
    formatGroup: 'filtration-minerals',
    shortDescription:
      'Angular fractured high-grade anthracite media (1.2 mm, 3 mm & 4–8 mesh) built for dual-media filters to maximize solids loading and cut backwash loss.',
    overview:
      'Hard, durable anthracite filter coal with lower specific gravity than silica sand, forming an ideal top coarse layer above fine sand to trap turbidity deep throughout the bed.',
    applications: [
      'Dual-Media & Multi-Media Water Filters',
      'Municipal & Industrial Turbidity Reduction',
      'High-Rate Cooling Water Clarification',
    ],
    image: PORTFOLIO_IMAGES.productAnthraciteCoal,
    imageAlt:
      'Gleaming angular crushed anthracite coal filter media granules spread on stainless testing tray',
    editableFields: {
      sourcingScope: '1.2 mm, 3.0 mm & 4–8 Mesh · Low Uniformity Coefficient',
      packagingPlaceholder: '25 kg / 50 kg Heavy-Duty Bags & 1 MT FIBC Bags',
      documentationNote:
        'Effective size (ES), uniformity coefficient (UC), and acid solubility test.',
    },
  },
  {
    id: 'manganese-dioxide',
    index: '08',
    title: 'Manganese Dioxide (MnO2) Media',
    familyLabel: 'Filtration Media & Minerals',
    formatGroup: 'filtration-minerals',
    shortDescription:
      'High-activity catalytic manganese dioxide iron-removal media engineered to oxidize and filter dissolved iron, manganese, and hydrogen sulfide.',
    overview:
      'Natural and processed MnO2 granular filter media delivering rapid catalytic oxidation without chemical regeneration in potable water, borehole supply, and industrial process lines.',
    applications: [
      'Iron & Manganese Removal Pressure Vessels',
      'Hydrogen Sulfide Odor Elimination',
      'Groundwater & Municipal Borehole Conditioning',
    ],
    image: PORTFOLIO_IMAGES.productManganeseDioxide,
    imageAlt:
      'Dark metallic charcoal-gray granular manganese dioxide catalytic filter media in stainless scoop',
    editableFields: {
      sourcingScope: 'Controlled Mesh & High MnO2 Purity Grades',
      packagingPlaceholder: '25 kg / 50 kg Moisture-Sealed Bags & Bulk Sacks',
      documentationNote:
        'Assay %, particle gradation, and moisture COA attached before stuffing.',
    },
  },
  {
    id: 'slow-potash-release',
    index: '09',
    title: 'Slow Potash Release (Glauconite)',
    familyLabel: 'Filtration Media & Minerals',
    formatGroup: 'filtration-minerals',
    shortDescription:
      'Low-ash mineral glauconite and slow-release potassium compound formulated for sustained nutrient delivery in agriculture and specialty mineral blends.',
    overview:
      'Low-ash mineral carrier providing controlled potassium release and cation-exchange buffering over extended crop cycles, minimizing leaching loss in permeable soils.',
    applications: [
      'Controlled-Release Agricultural Fertilizers',
      'Horticultural & Turf Soil Conditioning',
      'Industrial Mineral Carrier Blends',
    ],
    image: PORTFOLIO_IMAGES.productSlowPotash,
    imageAlt:
      'Olive-green glauconite slow potash release mineral granules inside an open woven supply sack with scoop',
    editableFields: {
      sourcingScope: 'Low Ash Content Mineral Grade · Granular & Powder',
      packagingPlaceholder: '25 kg / 50 kg Laminated Bags & 1000 kg Big Bags',
      documentationNote:
        'Mineral composition breakdown and ash-content COA supplied on request.',
    },
  },
  {
    id: 'carbon-black',
    index: '10',
    title: 'Carbon Black',
    familyLabel: 'Filtration Media & Minerals',
    formatGroup: 'filtration-minerals',
    shortDescription:
      'Consistent industrial carbon black grades supplied for elastomer reinforcement, masterbatch pigment dispersion, coatings, and specialty conductivity.',
    overview:
      'Fine-structured industrial carbon black processed for clean dispersion, UV protection, tint strength, and mechanical reinforcement across industrial compounding lines.',
    applications: [
      'Rubber, Hoses & Industrial Elastomers',
      'Polymer Masterbatch & UV Stabilization',
      'Industrial Coatings, Inks & Conductive Compounds',
    ],
    image: PORTFOLIO_IMAGES.productCarbonBlack,
    imageAlt:
      'Velvet-black carbon black powder and fine microbeads on laboratory watch glass next to kraft sack',
    editableFields: {
      sourcingScope: 'Industrial Pelletized & Powder Grades',
      packagingPlaceholder: '20 kg / 25 kg Multi-Wall Paper Bags & FIBC Bulk',
      documentationNote:
        'DBP absorption, iodine value, and sieve residue reports per batch.',
    },
  },
  {
    id: '4a-molecular-sieve',
    index: '11',
    title: '4A Molecular Sieve Beads',
    familyLabel: 'Specialty Chemicals & Pigments',
    formatGroup: 'specialty-chemicals',
    shortDescription:
      'Uniform 4-angstrom synthetic zeolite desiccant beads engineered for deep moisture removal in compressed air dryers, natural gas, and solvent dehydration.',
    overview:
      'Alkali alumino-silicate beads featuring uniform 4-angstrom pore openings that selectively adsorb water and small polar molecules down to ultra-low dew points with high crush strength.',
    applications: [
      'Industrial Compressed Air & Gas Drying',
      'Insulated Glass & Refrigerant Dehydration',
      'Ethanol & Organic Solvent Moisture Control',
    ],
    image: PORTFOLIO_IMAGES.productMolecularSieve,
    imageAlt:
      'Uniform ceramic 4A molecular sieve desiccant spheres in borosilicate dish beside 1.6-2.5mm test sieve',
    editableFields: {
      sourcingScope: '1.6–2.5 mm & 3.0–5.0 mm Bead Formats',
      packagingPlaceholder: '25 kg Airtight Steel Drums / Sealed Foil-Lined Cartons',
      documentationNote:
        'Static water adsorption capacity, crush strength, and loss-on-ignition COA.',
    },
  },
  {
    id: 'tannic-acid',
    index: '12',
    title: 'Tannic Acid',
    familyLabel: 'Specialty Chemicals & Pigments',
    formatGroup: 'specialty-chemicals',
    shortDescription:
      'Fine brown powdered organic polyphenol compound utilized in boiler oxygen scavenging, metal passivation, tanning, and specialty filtration conditioning.',
    overview:
      'High-purity organic tannic acid powder offering reliable chelation, antioxidant performance, and surface-conditioning properties for industrial utility boilers and chemical synthesis.',
    applications: [
      'Boiler Water Oxygen Scavenging & Corrosion Control',
      'Metal Surface Passivation & Rust Conversion',
      'Textile Mordanting & Industrial Processing',
    ],
    image: PORTFOLIO_IMAGES.productTannicAcid,
    imageAlt:
      'Golden-tan fine powdered tannic acid inside clear glass laboratory reagent jar and porcelain dish',
    editableFields: {
      sourcingScope: 'Industrial & Technical Powder Grades',
      packagingPlaceholder: '25 kg Fiber Drums & Moisture-Proof Kraft Bags',
      documentationNote:
        'Purity assay, solubility, and SDS safety documentation included.',
    },
  },
  {
    id: 'red-oxide',
    index: '13',
    title: 'Red Oxide (~99.9% Purity)',
    familyLabel: 'Specialty Chemicals & Pigments',
    formatGroup: 'specialty-chemicals',
    shortDescription:
      'Ultra-high purity synthetic & natural red iron oxide pigment delivering intense opacity, weather resistance, and thermal stability for primers and polymers.',
    overview:
      'Micronized ~99.9% purity ferric oxide pigment engineered for corrosion-resistant metal primers, architectural coatings, ceramics, and concrete coloration.',
    applications: [
      'Anti-Corrosive Industrial Primers & Marine Coatings',
      'Plastics, Rubber & Construction Pigmentation',
      'Ceramics & Specialty Ferrite Feedstock',
    ],
    image: PORTFOLIO_IMAGES.productRedOxide,
    imageAlt:
      'Vibrant deep crimson-red iron oxide mineral pigment powder in steel sampling dish beside paper bag',
    editableFields: {
      sourcingScope: 'High-Purity ~99.9% Fe2O3 Pigment Grade',
      packagingPlaceholder: '25 kg Multi-Wall Bags & Shrink-Wrapped Export Pallets',
      documentationNote:
        'Fe2O3 assay, oil absorption, and 325-mesh sieve residue certificate.',
    },
  },
  {
    id: 'dow-hydronautics-membranes',
    index: '14',
    title: 'Membrane Dow Hydronautics',
    familyLabel: 'RO Membranes & Earthing',
    formatGroup: 'systems-earthing',
    shortDescription:
      'High-rejection industrial spiral-wound Reverse Osmosis membranes (8040 & 4040 elements) built for brackish desalination and ultrapure water production.',
    overview:
      'Commercial and industrial thin-film composite RO membrane elements delivering high salt rejection and energy-efficient permeate flux across municipal, pharma, and industrial WTP lines.',
    applications: [
      'Brackish Water & Seawater Desalination',
      'Zero Liquid Discharge (ZLD) & Effluent Recovery',
      'Boiler Feed & Process Demineralization',
    ],
    image: PORTFOLIO_IMAGES.productRoMembranes,
    imageAlt:
      'Blue fiberglass-wrapped 8040 and 4040 spiral-wound reverse osmosis membrane elements on workshop bench',
    editableFields: {
      sourcingScope: 'Standard 8040 & 4040 Industrial Elements',
      packagingPlaceholder: 'Factory-Sealed Vacuum Cartons & Crated Export Pallets',
      documentationNote:
        'Individual element serial verification and wet-test flow reports.',
    },
  },
  {
    id: 'solar-water-treatment-plants',
    index: '15',
    title: 'Solar Water Treatment Plants',
    familyLabel: 'RO Membranes & Earthing',
    formatGroup: 'systems-earthing',
    shortDescription:
      'Turnkey solar-powered water treatment configurations combining multi-media vessels, carbon beds, and RO trains for off-grid and industrial use.',
    overview:
      'Integrated filtration and purification skids uniting anthracite filter vessels, activated carbon polishers, membrane trains, and photovoltaic power conditioning.',
    applications: [
      'Off-Grid Municipal & Community Potable Water',
      'Industrial Effluent & Sewage Recycling (ETP / STP)',
      'Modular Commercial Brackish Desalination',
    ],
    image: PORTFOLIO_IMAGES.productSolarWtp,
    imageAlt:
      'Skid-mounted solar-powered reverse osmosis water treatment system with FRP vessels and photovoltaic panels',
    editableFields: {
      sourcingScope: 'Custom Flow Capacities · Photovoltaic & Grid Hybrid',
      packagingPlaceholder: 'Skid-Mounted Containerized Systems & Export Crates',
      documentationNote:
        'P&ID drawings, operating manuals, and commissioning checklists included.',
    },
  },
  {
    id: 'pipe-earthing-gel',
    index: '16',
    title: 'Pipe Earthing System',
    familyLabel: 'RO Membranes & Earthing',
    formatGroup: 'systems-earthing',
    shortDescription:
      'Low-earth-resistance pipe earthing electrodes, conductive carbon backfill compounds, and moisture-retaining earthing gels for electrical safety.',
    overview:
      'Engineered grounding assemblies pairing corrosion-resistant GI/copper-bonded pipe electrodes with hygroscopic earthing gel and carbon compound to maintain stable low ohm resistance year-round.',
    applications: [
      'Chemical Plants & Hazardous Zone Electrical Grounding',
      'Substations, Transformers & Solar Array Earthing',
      'Industrial & Commercial Lightning Protection',
    ],
    image: PORTFOLIO_IMAGES.productPipeEarthing,
    imageAlt:
      'Copper-bonded and galvanized steel pipe earthing electrode rods beside conductive backfill sacks and earthing gel packs',
    editableFields: {
      sourcingScope: 'Low Earth Resistance Pipe Electrodes & Gel Kits',
      packagingPlaceholder: 'Protective Sleeved Electrodes & 25 kg Conductive Compound Bags',
      documentationNote:
        'Dimensional specifications and resistivity performance sheets supplied.',
    },
  },
  {
    id: 'luxurious-flower-pots',
    index: '17',
    title: 'Luxurious Flower Pots',
    familyLabel: 'RO, Earthing & Eco-Utility',
    formatGroup: 'systems-earthing',
    shortDescription:
      'Architectural white ceramic and coir-composite decorative planters complementing our eco-friendly coconut shell and horticultural supply line.',
    overview:
      'Durable, weather-resistant decorative planters designed for indoor, terrace, landscape, and architectural greenery installations alongside agricultural slow-potash soil conditioning.',
    applications: [
      'Commercial Landscaping & Architectural Patios',
      'Horticultural Nurseries & Indoor Spaces',
      'Eco-Friendly Coir & Gardening Supply',
    ],
    image: PORTFOLIO_IMAGES.productFlowerPots,
    imageAlt:
      'Modern white ceramic and coir-composite luxurious decorative flower pots arranged on natural stone patio',
    editableFields: {
      sourcingScope: 'Architectural White & Coir-Composite Finishes',
      packagingPlaceholder: 'Cushioned Individual Cartons & Palletized Export Crates',
      documentationNote:
        'Dimensional catalog and lot quantity schedules confirmed on order.',
    },
  },
];

export const COMPANY_VISION_MISSION_ITEMS = [
  {
    id: 'vision',
    label: 'Our Vision',
    title: 'Sustainable Water & Industrial Processing Solutions',
    summary:
      'Driven by a commitment to sustainability, innovation, and customer satisfaction—delivering cost-effective, high-performance purification media and chemical inputs that support cleaner water, reliable industrial operations, and environmental protection.',
  },
  {
    id: 'mission',
    label: 'Our Mission',
    title: 'Superior Adsorption Efficiency & Ethical Trade',
    summary:
      'Providing consistently high-grade activated carbon, mineral filter media, and industrial chemicals engineered from carefully inspected raw materials, backed by transparent commercial practices and dependable fulfillment.',
  },
  {
    id: 'infrastructure',
    label: 'Processing Facility',
    title: 'Dedicated Production, Activation & Screening Lines',
    summary:
      'Equipped with structured processing units handling raw coconut shell sorting, carbonization, coal sizing, and multi-mesh particle grading to deliver uniform product consistency across every batch.',
  },
  {
    id: 'warehousing',
    label: 'Warehouse & QC',
    title: 'Controlled Bulk Storage & Pre-Dispatch Inspection',
    summary:
      'Supported by organized industrial warehousing and experienced quality control teams managing moisture-barrier packaging, batch retention sampling, and timely container dispatch.',
  },
];

export const QUALITY_BENCHMARKS = [
  {
    metric: '~950 mg/g',
    label: 'Iodine Adsorption (GAC 1240)',
    detail: 'High microporous surface activity for trace organic and chlorine removal',
  },
  {
    metric: '~98%',
    label: 'Mechanical Hardness',
    detail: 'Minimal attrition loss during repeated high-velocity hydraulic backwash',
  },
  {
    metric: '0.45–0.55 g/cm³',
    label: 'Apparent Density (GAC)',
    detail: 'Balanced bed weight for municipal and industrial pressure vessels',
  },
  {
    metric: '~99.9%',
    label: 'Red Oxide Purity Assay',
    detail: 'High-opacity ferric oxide consistency for coatings and polymers',
  },
  {
    metric: '1.2 / 3.0 mm',
    label: 'Anthracite Media Grading',
    detail: 'Fractured angular media (plus 4–8 mesh) engineered for dual-media filters',
  },
  {
    metric: '<5% Moisture',
    label: 'Charcoal Powder Control',
    detail: 'Low-moisture lined packaging safeguarding shelf stability in transit',
  },
];

export const HERO_CAPABILITY_STRIP = [
  {
    index: '01',
    title: 'Activated Carbon & Charcoal',
    detail: 'Coal-based, coconut shell, GAC 1240 Norit & charcoal powder grades',
    targetSection: 'products',
  },
  {
    index: '02',
    title: 'Filtration Media & Minerals',
    detail: 'Anthracite coal, MnO2 iron removal, carbon black & slow potash',
    targetSection: 'products',
  },
  {
    index: '03',
    title: 'Specialty Adsorbents & Pigments',
    detail: '4A molecular sieve beads, ~99.9% red oxide & tannic acid',
    targetSection: 'products',
  },
  {
    index: '04',
    title: 'RO Membranes & Earthing',
    detail: 'Dow/Hydronautics 8040/4040 elements, solar WTP & pipe earthing',
    targetSection: 'global-reach',
  },
];

export interface SourcingWorkflowStep {
  id: string;
  stepNumber: string;
  title: string;
  phase: string;
  summary: string;
  deliverables: string[];
  handlingNote: string;
}

export const SOURCING_WORKFLOW_STEPS: SourcingWorkflowStep[] = [
  {
    id: 'specification',
    stepNumber: '01',
    title: 'Requirement & Specification Review',
    phase: 'Commercial Intake',
    summary:
      'Reviewing target carbon mesh, filtration media gradation, chemical purity, estimated order volumes, destination port, and preferred delivery cadence.',
    deliverables: [
      'Mesh size, iodine value & purity specification alignment',
      'Order volume & vessel schedule scoping',
      'Destination port & Incoterm selection',
    ],
    handlingNote: 'Structured B2B intake aligned to buyer technical briefs.',
  },
  {
    id: 'qualification',
    stepNumber: '02',
    title: 'Producer Sourcing & Commercial Offer',
    phase: 'Supply Matching',
    summary:
      'Matching verified carbonization kilns, mineral processing lines, and chemical producers with clear commercial quotations and lead times.',
    deliverables: [
      'Multi-origin producer & grade comparison',
      'Commercial quotation & validity window',
      'Laboratory sample dispatch when required',
    ],
    handlingNote: 'Transparent commercial alignment before order commitment.',
  },
  {
    id: 'verification',
    stepNumber: '03',
    title: 'Pre-Shipment Quality & Batch Review',
    phase: 'Quality Discipline',
    summary:
      'Coordinating batch-level analytical testing—including iodine value, moisture, ash, sieve curve, and assay verification—prior to container stuffing.',
    deliverables: [
      'Batch analytical COA & sieve gradation check',
      'Moisture-barrier sack, drum & IBC labeling inspection',
      'Loading supervision coordination',
    ],
    handlingNote: 'Documentation and batch checks completed prior to vessel departure.',
  },
  {
    id: 'documentation',
    stepNumber: '04',
    title: 'Export Documentation & Packaging',
    phase: 'Trade Compliance',
    summary:
      'Preparing consistent international trade and chemical safety paperwork tailored to destination customs and industrial plant receiving protocols.',
    deliverables: [
      'Commercial invoice, packing list & origin papers',
      'Safety data sheets (SDS) & hazard handling documentation',
      'Bill of lading & transit insurance coordination',
    ],
    handlingNote: 'Clear customs-ready paperwork aligned with maritime regulations.',
  },
  {
    id: 'dispatch',
    stepNumber: '05',
    title: 'Maritime Freight & Delivery Follow-Through',
    phase: 'Logistics Execution',
    summary:
      'Tracking vessel departure, transshipment milestones, and arrival handoff through to water treatment plants, factories, and regional warehouses.',
    deliverables: [
      'Booking & container milestone tracking',
      'Arrival notice & document release coordination',
      'Post-delivery commercial follow-up',
    ],
    handlingNote: 'Consistent single-desk communication until cargo arrival.',
  },
];

export const PACKAGING_FORMATS = [
  'To Be Discussed',
  '25 kg / 50 kg Moisture-Barrier Sacks',
  '500 kg / 1000 kg FIBC Jumbo Bags',
  'Steel / HDPE Drums & Fiber Drums',
  'IBC Totes (1000L) & Carboys',
  'Crated Export Pallets / FCL Lot',
] as const;

export const TRADE_INCOTERMS = [
  'To Be Confirmed',
  'FOB',
  'CIF',
  'CFR',
  'EXW',
  'DDP',
] as const;

export interface IndustrySector {
  id: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
}

export const INDUSTRY_SECTORS: IndustrySector[] = [
  {
    id: 'water-wastewater',
    title: 'Water Treatment & Purification (WTP / STP / ETP)',
    summary:
      'Supplying coconut shell and coal-based activated carbon, GAC 1240 Norit, anthracite coal, manganese dioxide (MnO2), Dow/Hydronautics 8040/4040 RO membranes, and solar WTP units for drinking water, wastewater, and effluent treatment.',
    image: PORTFOLIO_IMAGES.productSolarWtp,
    imageAlt: 'Solar-powered water treatment plant with FRP pressure vessels and RO skids',
  },
  {
    id: 'air-gas-purification',
    title: 'Air Purification & Gas Drying',
    summary:
      'High-activity granular carbon and uniform 4A molecular sieve desiccant beads engineered for VOC scrubbing, odor elimination, compressed air dehydration, and gas purification beds.',
    image: PORTFOLIO_IMAGES.productMolecularSieve,
    imageAlt: 'Uniform 4A molecular sieve desiccant beads beside precision laboratory sieves',
  },
  {
    id: 'gold-beverage-recovery',
    title: 'Gold Recovery & Beverage Processing',
    summary:
      'High-hardness microporous coconut shell activated carbon (8/16 mesh & custom sizes) engineered for CIP/CIL precious metal gold recovery and high-clarity beverage decolorization.',
    image: PORTFOLIO_IMAGES.productCoconutCarbon,
    imageAlt: 'High-hardness 8x16 mesh coconut shell activated carbon beside coconut shells',
  },
  {
    id: 'industrial-metallurgy',
    title: 'Industrial Processing, Steel & Pigments',
    summary:
      'Manganese dioxide lumps & filter media for steelmaking and casting, ~99.9% red iron oxide pigments, industrial carbon black, and powdered tannic acid for surface conditioning.',
    image: PORTFOLIO_IMAGES.productRedOxide,
    imageAlt: 'Vibrant crimson red iron oxide pigment mounded in steel sampling bowl',
  },
  {
    id: 'electrical-earthing',
    title: 'Electrical Grounding & Pipe Earthing',
    summary:
      'Low-earth-resistance pipe earthing electrode systems, conductive carbon backfill compounds, and moisture-retaining earthing gels ensuring dependable grounding safety.',
    image: PORTFOLIO_IMAGES.productPipeEarthing,
    imageAlt: 'Copper-bonded and galvanized steel pipe earthing rods with conductive backfill sacks',
  },
  {
    id: 'agriculture-horticulture',
    title: 'Agriculture & Horticultural Eco-Utilities',
    summary:
      'Low-ash glauconite slow potash release fertilizers tailored for sustained nutrient delivery in coconut and banana crops alongside raw coconut shells and luxurious decorative flower pots.',
    image: PORTFOLIO_IMAGES.productSlowPotash,
    imageAlt: 'Olive-green glauconite slow potash release mineral granules inside bulk sack',
  },
];

export interface GlobalRegionNode {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  coverageNote: string;
}

export const GLOBAL_ORIGIN_HUB = {
  id: 'india-dispatch',
  name: 'India · Global Export Hub',
  lat: 20.5,
  lon: 78.9,
} as const;

export const GLOBAL_REGION_NODES: GlobalRegionNode[] = [
  {
    id: 'asia-middle-east',
    name: 'Asia & Middle East',
    label: 'All Nations Covered',
    lat: 25.2,
    lon: 55.3,
    coverageNote:
      'Direct sea and air export across India, Gulf Cooperation Council nations, Southeast Asia, Central Asia, and East Asia Pacific.',
  },
  {
    id: 'europe',
    name: 'Europe & United Kingdom',
    label: 'All Nations Covered',
    lat: 50.1,
    lon: 10.4,
    coverageNote:
      'Complete EU, UK, Nordic, and Mediterranean port-to-port and door-to-door delivery for water treatment and industrial plants.',
  },
  {
    id: 'north-america',
    name: 'North & Central America',
    label: 'All Nations Covered',
    lat: 39.8,
    lon: -98.5,
    coverageNote:
      'Transoceanic containerized FCL/LCL and air freight supply serving the USA, Canada, Mexico, and Caribbean industrial ports.',
  },
  {
    id: 'south-america',
    name: 'South America',
    label: 'All Nations Covered',
    lat: -14.2,
    lon: -51.9,
    coverageNote:
      'Dedicated maritime lanes supporting municipal utilities, mining gold recovery, and chemical processors across Latin America.',
  },
  {
    id: 'africa',
    name: 'Africa',
    label: 'All Nations Covered',
    lat: 1.5,
    lon: 21.0,
    coverageNote:
      'Continent-wide chemical, filtration media, solar WTP, and earthing supply covering North, East, West, Central, and Southern Africa.',
  },
  {
    id: 'oceania',
    name: 'Australia & Oceania',
    label: 'All Nations Covered',
    lat: -25.3,
    lon: 133.8,
    coverageNote:
      'Reliable Pacific freight coordination serving Australia, New Zealand, and island industrial and potable water facilities.',
  },
];

export const QUALITY_PILLARS = [
  {
    index: '01',
    title: 'Multi-Stage Sieve & Assay Verification',
    description:
      'Every lot of activated carbon, anthracite, MnO2, and chemical powder undergoes mesh gradation, moisture, ash, and purity checks before dispatch.',
  },
  {
    index: '02',
    title: 'Reliable Industrial Supply Continuity',
    description:
      'Structured inventory coordination across bulk sacks, drums, and containerized shipments keeping municipal plants and factories continuously supplied.',
  },
  {
    index: '03',
    title: 'Moisture-Sealed & Safe Chemical Packaging',
    description:
      'Deploying HDPE-lined woven bags, airtight steel drums for desiccants, and UN-compliant containers to safeguard adsorption activity in transit.',
  },
  {
    index: '04',
    title: 'Complete Export & Technical Paperwork',
    description:
      'Aligning Certificate of Analysis (COA), Safety Data Sheets (SDS), and customs export documentation cleanly ahead of vessel departure.',
  },
];

export const WHY_CHOOSE_ITEMS = [
  {
    id: 'complete-water-portfolio',
    title: 'Complete Carbon & Filtration Portfolio',
    description:
      'Single-source commercial procurement spanning coal and coconut shell activated carbon, anthracite, manganese dioxide, molecular sieves, and RO elements.',
  },
  {
    id: 'verified-specifications',
    title: 'Batch-Tested Technical Consistency',
    description:
      'Consistent iodine numbers, low ash levels, controlled effective sizes, and ~99.9% high-purity chemical inputs tailored to exact plant specs.',
  },
  {
    id: 'custom-packaging-grading',
    title: 'Flexible Mesh Sizing & Export Formats',
    description:
      'Custom particle screening from 8/16 and 12x40 mesh granules to fine powders, packaged in 25 kg bags, 1 MT jumbo sacks, or airtight drums.',
  },
  {
    id: 'direct-commercial-desk',
    title: 'Dedicated B2B Supply Coordination',
    description:
      'Responsive single-desk commercial handling from technical sample evaluation through international maritime logistics and destination clearance.',
  },
];

export const SUPPORT_EMAIL = 'support@alorixglobalinternational.com';

export const ENQUIRY_DESK_NOTICE = {
  headline: 'Direct Digital Enquiry Desk',
  summary:
    'Reach our commercial and technical support team directly at support@alorixglobalinternational.com, or submit product requirements, mesh specifications, and container inquiries via the validated enquiry form.',
  note: 'Supports multi-product sourcing briefs, packaging selection, and Incoterm scoping.',
};

export const WHATSAPP_ORDER_NUMBER = '917047837013';
export const WHATSAPP_ORDER_DISPLAY = '+91 7047837013';

export const ORDER_UNITS = ['Bags', 'kg', 'MT', 'Drums', 'Units', 'Sets'] as const;
export type OrderUnit = (typeof ORDER_UNITS)[number];

export interface CartItem {
  productId: string;
  quantity: number;
  unit: OrderUnit;
}

const UNIT_DEFAULTS_MAP: Record<string, OrderUnit> = {
  'molecular-sieve-4a-beads': 'Drums',
  'ro-membranes-dow-hydronautics': 'Units',
  'solar-water-treatment-plants': 'Units',
  'pipe-earthing-system': 'Units',
  'luxurious-flower-pots': 'Units',
};

export function getDefaultUnitForProduct(productId: string): OrderUnit {
  return UNIT_DEFAULTS_MAP[productId] || 'Bags';
}

export function buildWhatsAppOrderMessage(params: {
  items: { product: ChemicalCategory; quantity: number; unit: OrderUnit }[];
  customerName: string;
  deliveryAddress: string;
  orderNotes?: string;
}): string {
  const { items, customerName, deliveryAddress, orderNotes } = params;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const productLines = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.product.title} — Qty: ${item.quantity} ${item.unit}`
    )
    .join('\n');

  const lines = [
    '*NEW ORDER — ALORIX GLOBAL INTERNATIONAL*',
    '',
    '*Product List:*',
    productLines,
    '',
    `*Total Products:* ${items.length}`,
    `*Total Quantity:* ${totalQuantity}`,
    '',
    `*Customer / Company:* ${customerName.trim()}`,
    '*Delivery Address:*',
    deliveryAddress.trim(),
  ];

  if (orderNotes && orderNotes.trim()) {
    lines.push('', `*Notes / Specifications:* ${orderNotes.trim()}`);
  }

  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(
    message
  )}`;
}
