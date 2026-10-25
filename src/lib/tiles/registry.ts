import type { Component } from "svelte";
import DummyTile from "../components/DummyTile.svelte";
import Calculator from "./calculator/Calculator.svelte";
import Notes from "./notes/Notes.svelte";
import Tasks from "./tasks/Tasks.svelte";
import Graphing from "./graphing/Graphing.svelte";
import Cas from "./cas/Cas.svelte";
import MatrixTile from "./matrix/Matrix.svelte";
import Latex from "./latex/Latex.svelte";
import UnitConverter from "./unitconverter/UnitConverter.svelte";
import Constants from "./constants/Constants.svelte";
import FormulaSheet from "./formulasheet/FormulaSheet.svelte";
import PhysicsSim from "./physicssim/PhysicsSim.svelte";
import BigO from "./bigo/BigO.svelte";
import BaseConverter from "./baseconverter/BaseConverter.svelte";
import RegexTester from "./regex/RegexTester.svelte";
import DataFormatter from "./dataformatter/DataFormatter.svelte";
import GitCheatsheet from "./gitcheatsheet/GitCheatsheet.svelte";
import DataStructures from "./datastructures/DataStructures.svelte";
import HashCalculator from "./hashcalc/HashCalculator.svelte";
import EncodingToolkit from "./encoding/EncodingToolkit.svelte";
import PasswordEntropy from "./passwordentropy/PasswordEntropy.svelte";
import CveGlossary from "./cve/CveGlossary.svelte";
import NetworkTools from "./network/NetworkTools.svelte";
import TensorShape from "./tensorshape/TensorShape.svelte";
import NnViz from "./nnviz/NnViz.svelte";
import Tokenizer from "./tokenizer/Tokenizer.svelte";
import MlCheatsheet from "./mlcheatsheet/MlCheatsheet.svelte";
import Flashcards from "./flashcards/Flashcards.svelte";
import Pomodoro from "./pomodoro/Pomodoro.svelte";
import Scratchpad from "./scratchpad/Scratchpad.svelte";
import MediaController from "./media/MediaController.svelte";
import Calendar from "./calendar/Calendar.svelte";
import Settings from "./settings/Settings.svelte";
import HyprLearn from "./hyprlearn/HyprLearn.svelte";
import CppCheatsheet from "./cppcheatsheet/CppCheatsheet.svelte";
import PhysicsSandbox from "./physicssandbox/PhysicsSandbox.svelte";
import CodeRunner from "./coderunner/CodeRunner.svelte";
import PeriodicTable from "./periodictable/PeriodicTable.svelte";
import GameOfLife from "./gameoflife/GameOfLife.svelte";
import Probability from "./probability/Probability.svelte";
import Vault from "./vault/Vault.svelte";
import JwtInspector from "./jwt/JwtInspector.svelte";
import ClassicalCiphers from "./classicalciphers/ClassicalCiphers.svelte";
import GradientDescent from "./gradientdescent/GradientDescent.svelte";

/**
 * Maps a tile_type string (as stored in the Rust Layout tree) to the Svelte
 * component that renders it. Add new STEM/cybersecurity/AI/etc. tiles here.
 */
export const tileRegistry: Record<string, Component<any>> = {
  dummy: DummyTile,
  calculator: Calculator,
  notes: Notes,
  tasks: Tasks,
  graphing: Graphing,
  cas: Cas,
  matrix: MatrixTile,
  latex: Latex,
  unitconverter: UnitConverter,
  constants: Constants,
  formulasheet: FormulaSheet,
  physicssim: PhysicsSim,
  bigo: BigO,
  baseconverter: BaseConverter,
  regex: RegexTester,
  dataformatter: DataFormatter,
  gitcheatsheet: GitCheatsheet,
  datastructures: DataStructures,
  hashcalc: HashCalculator,
  encoding: EncodingToolkit,
  passwordentropy: PasswordEntropy,
  cve: CveGlossary,
  network: NetworkTools,
  tensorshape: TensorShape,
  nnviz: NnViz,
  tokenizer: Tokenizer,
  mlcheatsheet: MlCheatsheet,
  flashcards: Flashcards,
  pomodoro: Pomodoro,
  scratchpad: Scratchpad,
  media: MediaController,
  calendar: Calendar,
  settings: Settings,
  hyprlearn: HyprLearn,
  cppcheatsheet: CppCheatsheet,
  physicssandbox: PhysicsSandbox,
  coderunner: CodeRunner,
  periodictable: PeriodicTable,
  gameoflife: GameOfLife,
  probability: Probability,
  vault: Vault,
  jwt: JwtInspector,
  classicalciphers: ClassicalCiphers,
  gradientdescent: GradientDescent,
};

export const fallbackTileType = "dummy";
