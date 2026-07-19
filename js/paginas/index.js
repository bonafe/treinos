import { TreinosStorage } from "../storage.js";

if (!TreinosStorage.lerJSON("dadosTreinos.v1", null)) {
  document.getElementById("avisoDados").hidden = false;
}
