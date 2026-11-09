"""
Conversor das simulacoes de intervencao (scripts/converter_intervencoes.py): limiar de 10 cm, mosaico por maior
profundidade, area por faixa, rampa de cores e validacao das bacias. Sinteticos; precisam de geopandas/rasterio
(sem eles os testes sao pulados). O ultimo teste usa o RAW/ real e e pulado se ele nao existir.
"""

import sys
import tempfile
import unittest
from pathlib import Path

try:
    import geopandas  # noqa: F401
    import numpy as np
    import rasterio
    from pyproj import Transformer
    from rasterio.transform import Affine, from_origin, rowcol

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if TEM_GEO:
    import converter_intervencoes as ci  # noqa: E402
    import raster_comum as rc  # noqa: E402


def _gravar(p: Path, valores, x0: float, y0: float) -> Path:
    """GeoTIFF float32 em EPSG:31982, pixel de 1 m, canto superior esquerdo em (x0, y0)."""
    valores = np.asarray(valores, dtype="float32")
    with rasterio.open(
        p, "w", driver="GTiff", height=valores.shape[0], width=valores.shape[1], count=1, dtype="float32",
        crs="EPSG:31982", transform=from_origin(x0, y0, 1, 1), nodata=np.nan,
    ) as dst:
        dst.write(valores, 1)
    return p


@unittest.skipUnless(TEM_GEO, "precisa de geopandas/rasterio")
class TestMascaraEArea(unittest.TestCase):
    def test_limiar_10cm(self):
        r = ci.mascara_atingido(np.array([9.9, 10.0, np.nan, 200.0]))
        self.assertEqual(r.tolist(), [False, True, False, True])

    def test_area_por_faixa_nas_bordas(self):
        prof = np.array([[9.9, 10.0, 44.9, 45.0], [64.9, 100.0, 144.9, 145.0], [np.nan, 300.0, 84.9, 85.0]])
        r = ci.area_por_faixa_ha(prof, 10_000.0)  # cada pixel = 1 ha
        self.assertEqual(r["10-44"], 2.0)  # 10,0 e 44,9
        self.assertEqual(r["45-64"], 2.0)  # 45,0 e 64,9
        self.assertEqual(r["65-84"], 1.0)  # 84,9
        self.assertEqual(r["85-104"], 2.0)  # 85,0 e 100,0
        self.assertEqual(r["105-124"], 0.0)
        self.assertEqual(r["125-144"], 1.0)  # 144,9
        self.assertEqual(r["145+"], 2.0)  # 145,0 e 300,0

    def test_area_por_faixa_soma_a_area_total(self):
        prof = np.array([[10.0, 50.0, np.nan], [120.0, 9.0, 200.0]])
        faixas = ci.area_por_faixa_ha(prof, 5_000.0)
        total = float(ci.mascara_atingido(prof).sum()) * 5_000.0 / 1e4
        self.assertAlmostEqual(sum(faixas.values()), total, places=6)

    def test_area_pixel_por_linha_proxima_de_1m2(self):
        a = ci.area_pixel_m2_por_linha(Affine(1e-5, 0, -52.1, 0, -1e-5, -32.0), 3)
        self.assertEqual(a.shape, (3, 1))
        self.assertAlmostEqual(float(a[0, 0]), 1.0479, delta=0.005)

    def test_area_pixel_por_linha_diminui_com_a_latitude_absoluta(self):
        # No hemisferio sul, linhas mais ao sul estao mais longe do equador: o grau de longitude encurta.
        a = ci.area_pixel_m2_por_linha(Affine(1e-5, 0, -52.1, 0, -0.01, -32.0), 3)
        self.assertLess(float(a[2, 0]), float(a[1, 0]))
        self.assertLess(float(a[1, 0]), float(a[0, 0]))


@unittest.skipUnless(TEM_GEO, "precisa de geopandas/rasterio")
class TestRampa(unittest.TestCase):
    def test_rampa_cores(self):
        rgba = np.array(ci.rgba_profundidade(np.array([[9.0, 10.0, 44.9, 50.0, 145.0, 200.0, np.nan]])))
        self.assertEqual(int(rgba[0, 0, 3]), 0)  # < 10: transparente
        self.assertEqual(tuple(rgba[0, 1]), (184, 161, 217, 255))  # 10 cm: #b8a1d9
        self.assertEqual(tuple(rgba[0, 2]), (184, 161, 217, 255))  # 44,9 cm
        self.assertEqual(tuple(rgba[0, 3]), (75, 0, 130, 255))  # 50 cm: #4b0082
        self.assertEqual(tuple(rgba[0, 4]), (255, 0, 0, 255))  # 145 cm: #ff0000
        self.assertEqual(tuple(rgba[0, 5]), (255, 0, 0, 255))
        self.assertEqual(int(rgba[0, 6, 3]), 0)  # NaN: transparente


@unittest.skipUnless(TEM_GEO, "precisa de geopandas/rasterio")
class TestBacias(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.pasta = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_localizar_bacias_ignora_caixa_do_nome(self):
        for nome in ("bacia1.tif", "BACIA2.tif", "Bacia3.TIF", "bacia4.tif", "bacia5.tif", "bacia7.tif"):
            (self.pasta / nome).write_bytes(b"x")
        (self.pasta / "bacia1.qml").write_bytes(b"x")  # nao e raster
        r = ci.localizar_bacias(self.pasta)
        self.assertEqual(sorted(r), [1, 2, 3, 4, 5, 7])
        self.assertTrue(all(p.suffix.lower() == ".tif" for p in r.values()))

    def test_bacia_ausente_falha_claro(self):
        for n in (1, 2, 3, 4, 5):
            (self.pasta / f"bacia{n}.tif").write_bytes(b"x")
        with self.assertRaises(FileNotFoundError) as cm:
            ci.localizar_bacias(self.pasta)
        self.assertIn("7", str(cm.exception))

    def test_exigir_agua_falha_sem_pixel_molhado(self):
        with self.assertRaises(ValueError):
            ci.exigir_agua(np.full((4, 4), np.nan, dtype="float32"), "teste")
        with self.assertRaises(ValueError):
            ci.exigir_agua(np.full((4, 4), 5.0, dtype="float32"), "teste")  # tudo abaixo de 10 cm
        self.assertTrue(ci.exigir_agua(np.array([[np.nan, 12.0]], dtype="float32"), "teste")[0, 1])

    def test_mosaico_usa_maior_profundidade(self):
        # A (30 cm) cobre x 392000-392010; B (80 cm) cobre x 392005-392015: sobrepoem-se em 392005-392010.
        a = _gravar(self.pasta / "a.tif", np.full((10, 10), 30.0), 392000, 6454010)
        b = _gravar(self.pasta / "b.tif", np.full((10, 10), 80.0), 392005, 6454010)
        paths = [b, a]  # com "ultimo valido vence", A (30) venceria na sobreposicao
        src_crs, tr, w, h = rc.compute_shared_grid(paths)
        mosaico = rc.reproject_group(paths, src_crs, tr, w, h, combinar="max")
        padrao = rc.reproject_group(paths, src_crs, tr, w, h)
        lon, lat = Transformer.from_crs(31982, 4326, always_xy=True).transform(392007.5, 6454005.0)
        linha, coluna = rowcol(tr, lon, lat)
        self.assertEqual(float(mosaico[linha, coluna]), 80.0)
        self.assertEqual(float(padrao[linha, coluna]), 30.0)  # o comportamento antigo segue o mesmo
        self.assertEqual(float(np.nanmax(mosaico)), 80.0)


@unittest.skipUnless(TEM_GEO, "precisa de geopandas/rasterio")
class TestRawReal(unittest.TestCase):
    def test_bounds_identicos_nos_12_conjuntos(self):
        from cenarios_intervencao import todos
        from raw_paths import SIM_INTERVENCOES

        if not SIM_INTERVENCOES.is_dir():
            self.skipTest("RAW/simulacoes-intervencoes ainda nao existe")
        todos_bounds = set()
        for evento, variante in todos():
            bacias = ci.localizar_bacias(SIM_INTERVENCOES / evento / variante)
            _, tr, w, h = rc.compute_shared_grid([bacias[n] for n in sorted(bacias)])
            todos_bounds.add(tuple(round(x, 9) for x in rasterio.transform.array_bounds(h, w, tr)))
        self.assertEqual(len(todos_bounds), 1, todos_bounds)


if __name__ == "__main__":
    unittest.main()
