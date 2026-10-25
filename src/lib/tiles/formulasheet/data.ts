import type { ReferenceEntry } from "../../components/ReferenceBrowser.svelte";

export const formulas: ReferenceEntry[] = [
  // --- Mechanics ---
  { id: "kinematics1", title: "Velocity (constant acceleration)", category: "Mechanics", latex: "v = v_0 + at", body: "v₀: initial velocity, a: acceleration, t: time.", tags: ["kinematics"] },
  { id: "kinematics2", title: "Position (constant acceleration)", category: "Mechanics", latex: "x = x_0 + v_0 t + \\tfrac{1}{2}at^2", body: "x₀: initial position.", tags: ["kinematics"] },
  { id: "kinematics3", title: "Velocity² (constant acceleration)", category: "Mechanics", latex: "v^2 = v_0^2 + 2a(x-x_0)", body: "Useful when time isn't known.", tags: ["kinematics"] },
  { id: "newton2", title: "Newton's second law", category: "Mechanics", latex: "F = ma", body: "Net force equals mass times acceleration.", tags: ["dynamics"] },
  { id: "gravity", title: "Newton's law of gravitation", category: "Mechanics", latex: "F = \\frac{Gm_1 m_2}{r^2}", body: "Attractive force between two point masses separated by r.", tags: ["gravity"] },
  { id: "weight", title: "Weight near Earth's surface", category: "Mechanics", latex: "W = mg", body: "g ≈ 9.80665 m/s².", tags: ["gravity"] },
  { id: "momentum", title: "Linear momentum", category: "Mechanics", latex: "p = mv", body: "Conserved in a closed system with no external force.", tags: ["momentum"] },
  { id: "impulse", title: "Impulse–momentum theorem", category: "Mechanics", latex: "J = F\\Delta t = \\Delta p", body: "Impulse equals change in momentum.", tags: ["momentum"] },
  { id: "ke", title: "Kinetic energy", category: "Mechanics", latex: "KE = \\tfrac{1}{2}mv^2", body: "", tags: ["energy"] },
  { id: "pe-grav", title: "Gravitational potential energy", category: "Mechanics", latex: "PE = mgh", body: "Near Earth's surface, h measured from a reference height.", tags: ["energy"] },
  { id: "pe-spring", title: "Elastic (spring) potential energy", category: "Mechanics", latex: "PE_{spring} = \\tfrac{1}{2}kx^2", body: "k: spring constant, x: displacement from equilibrium.", tags: ["energy"] },
  { id: "work", title: "Work", category: "Mechanics", latex: "W = Fd\\cos\\theta", body: "θ: angle between force and displacement.", tags: ["energy"] },
  { id: "power", title: "Power", category: "Mechanics", latex: "P = \\frac{W}{t} = Fv", body: "Rate of energy transfer.", tags: ["energy"] },
  { id: "centripetal", title: "Centripetal acceleration / force", category: "Mechanics", latex: "a_c = \\frac{v^2}{r}, \\quad F_c = \\frac{mv^2}{r}", body: "Directed toward the center of circular motion.", tags: ["circular"] },
  { id: "torque", title: "Torque", category: "Mechanics", latex: "\\tau = rF\\sin\\theta", body: "Rotational analogue of force.", tags: ["rotation"] },
  { id: "angmom", title: "Angular momentum", category: "Mechanics", latex: "L = I\\omega", body: "I: moment of inertia, ω: angular velocity.", tags: ["rotation"] },
  { id: "shm-period", title: "Simple harmonic motion period (spring)", category: "Mechanics", latex: "T = 2\\pi\\sqrt{\\frac{m}{k}}", body: "", tags: ["oscillation"] },
  { id: "pendulum-period", title: "Simple pendulum period (small angle)", category: "Mechanics", latex: "T = 2\\pi\\sqrt{\\frac{L}{g}}", body: "Valid for small oscillation amplitude.", tags: ["oscillation"] },

  // --- Electricity & Magnetism ---
  { id: "coulomb", title: "Coulomb's law", category: "E&M", latex: "F = k_e\\frac{q_1 q_2}{r^2}", body: "k_e ≈ 8.9876×10⁹ N·m²/C².", tags: ["electrostatics"] },
  { id: "efield", title: "Electric field of a point charge", category: "E&M", latex: "E = k_e\\frac{q}{r^2}", body: "", tags: ["electrostatics"] },
  { id: "voltage", title: "Electric potential (point charge)", category: "E&M", latex: "V = k_e\\frac{q}{r}", body: "", tags: ["electrostatics"] },
  { id: "ohm", title: "Ohm's law", category: "E&M", latex: "V = IR", body: "", tags: ["circuits"] },
  { id: "power-elec", title: "Electric power", category: "E&M", latex: "P = IV = I^2R = \\frac{V^2}{R}", body: "", tags: ["circuits"] },
  { id: "series-r", title: "Resistors in series", category: "E&M", latex: "R_{eq} = R_1 + R_2 + \\dots", body: "", tags: ["circuits"] },
  { id: "parallel-r", title: "Resistors in parallel", category: "E&M", latex: "\\frac{1}{R_{eq}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\dots", body: "", tags: ["circuits"] },
  { id: "capacitance", title: "Capacitor charge", category: "E&M", latex: "Q = CV", body: "", tags: ["circuits"] },
  { id: "cap-energy", title: "Energy stored in a capacitor", category: "E&M", latex: "U = \\tfrac{1}{2}CV^2", body: "", tags: ["circuits"] },
  { id: "rc-charge", title: "RC circuit charging", category: "E&M", latex: "V(t) = V_0\\left(1-e^{-t/RC}\\right)", body: "τ = RC is the time constant.", tags: ["circuits"] },
  { id: "lorentz", title: "Lorentz force", category: "E&M", latex: "\\vec{F} = q\\vec{E} + q\\vec{v}\\times\\vec{B}", body: "", tags: ["magnetism"] },
  { id: "biot-savart", title: "Magnetic field of a long straight wire", category: "E&M", latex: "B = \\frac{\\mu_0 I}{2\\pi r}", body: "", tags: ["magnetism"] },
  { id: "faraday", title: "Faraday's law of induction", category: "E&M", latex: "\\mathcal{E} = -\\frac{d\\Phi_B}{dt}", body: "Induced EMF opposes the change in magnetic flux.", tags: ["induction"] },

  // --- Thermodynamics ---
  { id: "ideal-gas", title: "Ideal gas law", category: "Thermodynamics", latex: "PV = nRT", body: "R ≈ 8.314 J/(mol·K).", tags: ["gas"] },
  { id: "first-law", title: "First law of thermodynamics", category: "Thermodynamics", latex: "\\Delta U = Q - W", body: "Change in internal energy equals heat added minus work done by the system.", tags: ["energy"] },
  { id: "heat-capacity", title: "Heat transfer (specific heat)", category: "Thermodynamics", latex: "Q = mc\\Delta T", body: "c: specific heat capacity.", tags: ["heat"] },
  { id: "latent-heat", title: "Latent heat (phase change)", category: "Thermodynamics", latex: "Q = mL", body: "L: latent heat of fusion/vaporization.", tags: ["heat"] },
  { id: "efficiency", title: "Heat engine efficiency", category: "Thermodynamics", latex: "\\eta = \\frac{W}{Q_h} = 1 - \\frac{Q_c}{Q_h}", body: "", tags: ["engines"] },
  { id: "carnot", title: "Carnot efficiency", category: "Thermodynamics", latex: "\\eta_{max} = 1 - \\frac{T_c}{T_h}", body: "Theoretical maximum, T in kelvin.", tags: ["engines"] },
  { id: "entropy", title: "Entropy change (reversible, isothermal)", category: "Thermodynamics", latex: "\\Delta S = \\frac{Q}{T}", body: "", tags: ["entropy"] },

  // --- Quantum ---
  { id: "planck-energy", title: "Photon energy", category: "Quantum", latex: "E = h\\nu = \\frac{hc}{\\lambda}", body: "ν: frequency, λ: wavelength.", tags: ["photon"] },
  { id: "debroglie", title: "De Broglie wavelength", category: "Quantum", latex: "\\lambda = \\frac{h}{p}", body: "Matter-wave wavelength of a particle with momentum p.", tags: ["waves"] },
  { id: "heisenberg", title: "Heisenberg uncertainty principle", category: "Quantum", latex: "\\Delta x\\, \\Delta p \\geq \\frac{\\hbar}{2}", body: "", tags: ["uncertainty"] },
  { id: "schrodinger", title: "Time-independent Schrödinger equation", category: "Quantum", latex: "-\\frac{\\hbar^2}{2m}\\frac{d^2\\psi}{dx^2} + V\\psi = E\\psi", body: "1D form.", tags: ["wavefunction"] },
  { id: "bohr-energy", title: "Bohr model energy levels (hydrogen)", category: "Quantum", latex: "E_n = -\\frac{13.6\\ \\mathrm{eV}}{n^2}", body: "n: principal quantum number.", tags: ["atomic"] },
  { id: "photoelectric", title: "Photoelectric effect", category: "Quantum", latex: "KE_{max} = h\\nu - \\phi", body: "φ: work function of the material.", tags: ["photon"] },
];
