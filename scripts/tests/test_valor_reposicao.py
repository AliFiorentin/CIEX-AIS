"""
Valor de reposicao (exposicao fisica em R$) por ponto e por setor (scripts/valor_reposicao.py).

O teste decisivo reproduz os totais `exposicao_total_brl` de climada_exposicao_rio_grande.json (empresas, educacao
e saude) a partir das camadas BASE; sem isso a exposicao em R$ dos cenarios de intervencao nao pode ser usada.
So stdlib + shapely (para o filtro de municipio); pulado se shapely nao estiver instalado.
"""

import json
import sys
import unittest
from pathlib import Path

try:
    import shapely  # noqa: F401

    TEM_SHAPELY = True
except ImportError:  # pragma: no cover
    TEM_SHAPELY = False

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
if TEM_SHAPELY:
    import valor_reposicao as vr  # noqa: E402

DADOS = ROOT / "public" / "dados_convertidos"
INSIDE = [-52.10, -32.03]  # dentro de Rio Grande
OUTSIDE = [-40.0, -10.0]


def _ponto(coords, **props):
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": coords}, "properties": props}


@unittest.skipUnless(TEM_SHAPELY, "precisa de shapely")
class TestRegras(unittest.TestCase):
    def setUp(self):
        self.p = vr.carregar_premissas()

    def test_empresa_comercial(self):
        v = vr.valor_empresa({"qtd_vinculos": 10, "setor": "COMERCIO; REPARACAO DE VEICULOS"}, self.p)
        self.assertAlmostEqual(v, 10 * 9 * 2604.24 * 2.0, places=2)  # 468.763,20

    def test_empresa_industrial_usa_cub_industrial_e_multiplicador_25(self):
        v = vr.valor_empresa({"qtd_vinculos": 10, "setor": "INDUSTRIAS DE TRANSFORMACAO"}, self.p)
        self.assertAlmostEqual(v, 10 * 9 * 1301.56 * 2.5, places=2)  # 292.851,00

    def test_escola_por_salas_equivalentes(self):
        # 644 alunos no fundamental / (32,2 x 2 turnos) = 10 salas de 142,2 m2 x CUB institucional x 1,5
        v = vr.valor_escola({"qtd_mat_fundamental": 644}, self.p)
        self.assertAlmostEqual(v, 10 * 142.2 * 2995.52 * 1.5, places=2)  # 6.389.444,16

    def test_escola_soma_educacao_especial_ao_fundamental(self):
        v = vr.valor_escola({"qtd_mat_fundamental": 322, "qtd_mat_especial": 322}, self.p)
        self.assertAlmostEqual(v, 10 * 142.2 * 2995.52 * 1.5, places=2)

    def test_escola_tem_piso_de_uma_sala(self):
        self.assertAlmostEqual(vr.valor_escola({}, self.p), 1 * 142.2 * 2995.52 * 1.5, places=2)

    def test_saude_profissionais_mais_leitos(self):
        v = vr.valor_saude({"qtd_profissionais": 6, "leitos_total": 4}, self.p)
        self.assertAlmostEqual(v, 10 * 9 * 2995.52 * 2.25, places=2)  # 606.592,80

    def test_saude_tem_piso_de_uma_pessoa(self):
        self.assertAlmostEqual(vr.valor_saude({}, self.p), 1 * 9 * 2995.52 * 2.25, places=2)

    def test_exposicao_ignora_pontos_fora_do_municipio_e_a_secretaria_excluida(self):
        gj = {
            "type": "FeatureCollection",
            "features": [
                _ponto(INSIDE, qtd_profissionais=1, leitos_total=0, co_cnes="1"),
                _ponto(OUTSIDE, qtd_profissionais=1, leitos_total=0, co_cnes="2"),
                _ponto(INSIDE, qtd_profissionais=1, leitos_total=0, co_cnes="6303609"),
            ],
        }
        self.assertAlmostEqual(vr.exposicao(gj, "saude"), vr.valor_saude({}, self.p), places=2)  # so o 1o


@unittest.skipUnless(TEM_SHAPELY, "precisa de shapely")
class TestValidacaoContraClimada(unittest.TestCase):
    def test_reproduz_totais_do_climada(self):
        expo = json.loads((DADOS / "climada_exposicao_rio_grande.json").read_text(encoding="utf-8"))
        alvo = expo["por_cota"]["2.6215"]
        base = {
            "empresas": "empresas_BASE.geojson",
            "educacao": "educacao_BASE.geojson",
            "saude": "saude_BASE.geojson",
        }
        for setor, arquivo in base.items():
            gj = json.loads((DADOS / "rio_grande" / arquivo).read_text(encoding="utf-8"))
            esperado = alvo[setor]["exposicao_total_brl"]
            obtido = vr.exposicao(gj, setor)
            self.assertAlmostEqual(obtido / esperado, 1.0, delta=0.005, msg=f"{setor}: {obtido} vs {esperado}")
            self.assertEqual(vr.contar(gj, setor), alvo[setor]["n_total"], setor)


if __name__ == "__main__":
    unittest.main()
