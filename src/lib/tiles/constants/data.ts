import type { ReferenceEntry } from "../../components/ReferenceBrowser.svelte";

// CODATA 2018/2022 recommended values.
export const constants: ReferenceEntry[] = [
  { id: "c", title: "Speed of light in vacuum", category: "Universal", latex: "c = 299\\,792\\,458\\ \\mathrm{m/s}", body: "Exact, by definition of the meter.", tags: ["codata", "exact"] },
  { id: "G", title: "Newtonian gravitational constant", category: "Universal", latex: "G = 6.67430 \\times 10^{-11}\\ \\mathrm{m^3\\,kg^{-1}\\,s^{-2}}", body: "Relative uncertainty 2.2\u00d710\u207b\u2075, the least precisely known fundamental constant.", tags: ["codata", "gravity"] },
  { id: "h", title: "Planck constant", category: "Universal", latex: "h = 6.62607015 \\times 10^{-34}\\ \\mathrm{J\\,s}", body: "Exact, by definition of the kilogram (2019 SI redefinition).", tags: ["codata", "exact", "quantum"] },
  { id: "hbar", title: "Reduced Planck constant", category: "Universal", latex: "\\hbar = h/2\\pi = 1.054571817 \\times 10^{-34}\\ \\mathrm{J\\,s}", body: "Exact (derived from h).", tags: ["codata", "quantum"] },
  { id: "k", title: "Boltzmann constant", category: "Universal", latex: "k_B = 1.380649 \\times 10^{-23}\\ \\mathrm{J/K}", body: "Exact, by definition of the kelvin (2019 SI redefinition).", tags: ["codata", "exact", "thermo"] },
  { id: "NA", title: "Avogadro constant", category: "Universal", latex: "N_A = 6.02214076 \\times 10^{23}\\ \\mathrm{mol^{-1}}", body: "Exact, by definition of the mole (2019 SI redefinition).", tags: ["codata", "exact"] },
  { id: "R", title: "Molar gas constant", category: "Universal", latex: "R = N_A k_B = 8.314462618\\ \\mathrm{J\\,mol^{-1}\\,K^{-1}}", body: "Exact (derived from N_A and k_B).", tags: ["codata", "exact", "thermo"] },

  { id: "e", title: "Elementary charge", category: "Electromagnetic", latex: "e = 1.602176634 \\times 10^{-19}\\ \\mathrm{C}", body: "Exact, by definition of the ampere (2019 SI redefinition).", tags: ["codata", "exact"] },
  { id: "eps0", title: "Vacuum electric permittivity", category: "Electromagnetic", latex: "\\varepsilon_0 = 8.8541878128 \\times 10^{-12}\\ \\mathrm{F/m}", body: "Relative uncertainty 1.5\u00d710\u207b\u00b9\u2070.", tags: ["codata"] },
  { id: "mu0", title: "Vacuum magnetic permeability", category: "Electromagnetic", latex: "\\mu_0 = 1.25663706212 \\times 10^{-6}\\ \\mathrm{N/A^2}", body: "Relative uncertainty 1.5\u00d710\u207b\u00b9\u2070.", tags: ["codata"] },
  { id: "ke", title: "Coulomb constant", category: "Electromagnetic", latex: "k_e = \\frac{1}{4\\pi\\varepsilon_0} = 8.9875517923 \\times 10^{9}\\ \\mathrm{N\\,m^2/C^2}", body: "Derived from \u03b5\u2080.", tags: ["codata"] },
  { id: "phi0", title: "Magnetic flux quantum", category: "Electromagnetic", latex: "\\Phi_0 = h/2e = 2.067833848 \\times 10^{-15}\\ \\mathrm{Wb}", body: "Exact (derived from h and e).", tags: ["codata"] },
  { id: "RK", title: "von Klitzing constant", category: "Electromagnetic", latex: "R_K = h/e^2 = 25\\,812.80745\\ \\Omega", body: "Exact (derived from h and e), used in quantum Hall resistance standards.", tags: ["codata"] },

  { id: "me", title: "Electron mass", category: "Atomic & Nuclear", latex: "m_e = 9.1093837015 \\times 10^{-31}\\ \\mathrm{kg}", body: "Relative uncertainty 3.0\u00d710\u207b\u00b9\u2070.", tags: ["codata", "particle"] },
  { id: "mp", title: "Proton mass", category: "Atomic & Nuclear", latex: "m_p = 1.67262192369 \\times 10^{-27}\\ \\mathrm{kg}", body: "Relative uncertainty 3.1\u00d710\u207b\u00b9\u2070.", tags: ["codata", "particle"] },
  { id: "mn", title: "Neutron mass", category: "Atomic & Nuclear", latex: "m_n = 1.67492749804 \\times 10^{-27}\\ \\mathrm{kg}", body: "Relative uncertainty 5.7\u00d710\u207b\u00b9\u2070.", tags: ["codata", "particle"] },
  { id: "u", title: "Atomic mass unit", category: "Atomic & Nuclear", latex: "u = 1.66053906660 \\times 10^{-27}\\ \\mathrm{kg}", body: "1/12 the mass of a carbon-12 atom.", tags: ["codata"] },
  { id: "alpha", title: "Fine-structure constant", category: "Atomic & Nuclear", latex: "\\alpha = e^2/(4\\pi\\varepsilon_0 \\hbar c) \\approx 1/137.035999", body: "Dimensionless; sets the strength of electromagnetic interaction.", tags: ["codata", "dimensionless"] },
  { id: "Rinf", title: "Rydberg constant", category: "Atomic & Nuclear", latex: "R_\\infty = 10\\,973\\,731.568160\\ \\mathrm{m^{-1}}", body: "Relative uncertainty 1.9\u00d710\u207b\u00b9\u00b2, one of the most precisely measured constants.", tags: ["codata"] },
  { id: "a0", title: "Bohr radius", category: "Atomic & Nuclear", latex: "a_0 = 5.29177210903 \\times 10^{-11}\\ \\mathrm{m}", body: "Most probable distance between the nucleus and electron in hydrogen's ground state.", tags: ["codata"] },

  { id: "g", title: "Standard gravity", category: "Physico-chemical", latex: "g_n = 9.80665\\ \\mathrm{m/s^2}", body: "Exact by convention; used to define kgf, lbf, standard atmosphere, etc.", tags: ["exact", "mechanics"] },
  { id: "atm", title: "Standard atmosphere", category: "Physico-chemical", latex: "1\\ \\mathrm{atm} = 101\\,325\\ \\mathrm{Pa}", body: "Exact, by definition.", tags: ["exact"] },
  { id: "sigma", title: "Stefan\u2013Boltzmann constant", category: "Physico-chemical", latex: "\\sigma = \\frac{\\pi^2 k_B^4}{60 \\hbar^3 c^2} = 5.670374419 \\times 10^{-8}\\ \\mathrm{W\\,m^{-2}\\,K^{-4}}", body: "Exact (derived from k_B, \u0127, c). Governs blackbody radiation power.", tags: ["exact", "thermo"] },
  { id: "b", title: "Wien wavelength displacement constant", category: "Physico-chemical", latex: "b = 2.897771955 \\times 10^{-3}\\ \\mathrm{m\\,K}", body: "\u03bb_max T = b for a blackbody spectrum.", tags: ["thermo"] },
];
