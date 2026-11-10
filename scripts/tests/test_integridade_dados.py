"""
Integridade dos dados de infraestrutura servidos ao dashboard (so stdlib).

Pega regressoes como a de Setembro/2023: a copia cega dos arquivos externos sobrescreveu o
arquivo de logradouros atingidos por outro sem atributos (properties = {}),
e o painel (que le infra_stats_*.json) passou a divergir do mapa.

As contagens aqui replicam as de scripts/gerar_infra_stats.py (count_flag,
count_ruas_unicas), que depende de geopandas e por isso nao e importado.
"""

import json
import sys
import unittest
from pathlib import Path

CENARIOS_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "public" / "dados_convertidos" / "rio_grande" / "cenarios"
)
SLUGS = [
    "cenario_setembro_2023",
    "cenario_maio_2024",
    "simulacao_de_maio_de_2024_50",
    "nivel_da_lagoa_chuva_acumulada_16_05_2024",
]
# Os 12 cenarios de intervencao (so entram se ja foram gerados; ver converter_intervencoes.py).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from cenarios_intervencao import slug_cenario, todos  # noqa: E402

SLUGS_INTERVENCAO = [slug_cenario(e, v) for e, v in todos()]
SLUGS += SLUGS_INTERVENCAO
CHAVES_LOGRADOURO = {"tipo", "nome", "drenagem", "iluminacao"}


def _logradouros(slug):
    p = CENARIOS_DIR / f"infra_logradouros_ATINGIDOS_rio_grande___{slug}.geojson"
    return [f.get("properties") or {} for f in json.loads(p.read_text(encoding="utf-8"))["features"]]


def _stats(slug):
    p = CENARIOS_DIR / f"infra_stats_rio_grande___{slug}.json"
    return json.loads(p.read_text(encoding="utf-8"))["Logradouros"]


def _flag(v):
    if v is None:
        return False
    try:
        return float(v) == 1
    except (TypeError, ValueError):
        return str(v).strip().lower() in ("1", "sim", "true", "yes")


def _ruas_unicas(props):
    if not props:
        return 0
    combos = {
        f"{str(p.get('tipo') or '').strip()} {str(p.get('nome') or '').strip()}".strip()
        for p in props
    }
    combos.discard("")
    return len(combos) or len(props)


class LogradourosAtingidos(unittest.TestCase):
    def test_todas_as_feicoes_tem_os_atributos_de_logradouro(self):
        for slug in SLUGS:
            with self.subTest(cenario=slug):
                props = _logradouros(slug)
                sem_chaves = [p for p in props if not CHAVES_LOGRADOURO <= set(p)]
                self.assertEqual(
                    len(sem_chaves), 0,
                    f"{len(sem_chaves)} de {len(props)} feicoes sem {sorted(CHAVES_LOGRADOURO)}",
                )

    def test_infra_stats_bate_com_o_arquivo_de_atingidos(self):
        for slug in SLUGS:
            with self.subTest(cenario=slug):
                props, st = _logradouros(slug), _stats(slug)
                self.assertEqual(st["segmentos_atingidos"], len(props))
                self.assertEqual(st["ruas_atingidas"], _ruas_unicas(props))
                self.assertEqual(st["drenagem_atingidos"], sum(_flag(p.get("drenagem")) for p in props))
                self.assertEqual(st["iluminacao_atingidos"], sum(_flag(p.get("iluminacao")) for p in props))



CHAVE_PONTO = {"empresas": "id", "educacao": "co_entidade", "saude": "co_cnes", "patrimonio": None}


def _pontos_atingidos(camada, slug):
    """Conjunto de identificadores dos pontos atingidos (coordenada quando a camada nao tem id)."""
    p = CENARIOS_DIR / f"{camada}_ATINGIDOS_rio_grande___{slug}.geojson"
    chave = CHAVE_PONTO[camada]
    out = set()
    for f in json.loads(p.read_text(encoding="utf-8"))["features"]:
        if chave:
            out.add(f["properties"].get(chave))
        else:
            out.add(tuple(round(c, 6) for c in f["geometry"]["coordinates"][:2]))
    return out


class Aninhamento(unittest.TestCase):
    """Maio 2024 + 50% e o mesmo evento de Maio 2024 com a agua 60 cm mais alta: tudo o que Maio 2024 atinge,
    o +50% tambem atinge. (Setembro 2023 e o 16/05 sao eventos diferentes e nao precisam ser subconjuntos.)"""

    def test_maio_2024_esta_contido_em_maio_2024_mais_50(self):
        for camada in CHAVE_PONTO:
            with self.subTest(camada=camada):
                maio = _pontos_atingidos(camada, "cenario_maio_2024")
                mais50 = _pontos_atingidos(camada, "simulacao_de_maio_de_2024_50")
                self.assertEqual(maio - mais50, set(), f"{camada}: pontos de Maio 2024 fora do +50%")


CAMADAS_ATINGIDOS = [
    "empresas_ATINGIDOS_rio_grande___{slug}.geojson",
    "educacao_ATINGIDOS_rio_grande___{slug}.geojson",
    "saude_ATINGIDOS_rio_grande___{slug}.geojson",
    "patrimonio_ATINGIDOS_rio_grande___{slug}.geojson",
    "infra_logradouros_ATINGIDOS_rio_grande___{slug}.geojson",
    "infra_quadras_ATINGIDOS_rio_grande___{slug}.fgb",
    "infra_terrenos_ATINGIDOS_rio_grande___{slug}.fgb",
    "cobertura_ATINGIDOS_rio_grande___{slug}.fgb",
    "rio_grande___{slug}.geojson",
    "altura_raster_rio_grande___{slug}.png",
    "agricultura_stats_rio_grande___{slug}.json",
    "infra_stats_rio_grande___{slug}.json",
]


class SimulacoesDeIntervencao(unittest.TestCase):
    """Os 12 cenarios de intervencao tem todos os arquivos que o app pede e pontos com atributos."""

    def test_todos_os_arquivos_existem(self):
        for slug in SLUGS_INTERVENCAO:
            for modelo in CAMADAS_ATINGIDOS:
                nome = modelo.format(slug=slug)
                with self.subTest(arquivo=nome):
                    self.assertTrue((CENARIOS_DIR / nome).exists(), nome)

    def test_pontos_atingidos_tem_propriedades(self):
        for slug in SLUGS_INTERVENCAO:
            for camada in ("empresas", "educacao", "saude"):
                with self.subTest(cenario=slug, camada=camada):
                    p = CENARIOS_DIR / f"{camada}_ATINGIDOS_rio_grande___{slug}.geojson"
                    feats = json.loads(p.read_text(encoding="utf-8"))["features"]
                    vazias = [f for f in feats if not f.get("properties")]
                    self.assertEqual(len(vazias), 0, f"{len(vazias)} de {len(feats)} feicoes sem properties")


if __name__ == "__main__":
    unittest.main()
