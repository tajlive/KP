# Fase 2-sanering — per-bruker-rapport (UTKAST, ingenting kjørt)

Generert: 2026-07-27 · Korrupte sesjoner: **388** · Brukere: **22** · Trades replayet: **3664**

Regler: start = `starting_capital_nok`; salg clampet til beholdning (Fase 1-invariant); FIFO-P&L; valuta via `usdt_nok_rate` (USDT-æra konvertert m/ sesjon-median).

| Bruker | Sesjoner | Gammel Σ kapital (NOK) | Ny Σ kapital (NOK) | Endring |
|---|---|---|---|---|
| (profil-løs 814b8c67…) | 9 | 102,868,449,756 | 3,647,078 | -102,864,802,677 |
| (profil-løs f91a1f43…) | 2 | 24,636,037 | 13,638,155 | -10,997,882 |
| (profil-løs 4211b1c7…) | 33 | 17,879,426 | 10,450,052 | -7,429,375 |
| (profil-løs 10de2b9b…) | 38 | 13,122,497 | 6,515,606 | -6,606,891 |
| (profil-løs 7734a444…) | 36 | 12,645,558 | 15,196,024 | 2,550,465 |
| (profil-løs eb292ddd…) | 33 | 10,466,046 | 8,814,729 | -1,651,317 |
| (profil-løs 4bd58f81…) | 36 | 9,614,661 | 25,147,524 | 15,532,863 |
| (profil-løs d4480fda…) | 31 | 9,227,664 | 8,380,390 | -847,274 |
| (profil-løs 67db9b24…) | 43 | 9,011,435 | 7,761,921 | -1,249,514 |
| (profil-løs 165b894d…) | 36 | 7,202,153 | 6,916,927 | -285,227 |
| (profil-løs 241e1133…) | 43 | 7,127,233 | 6,499,400 | -627,833 |
| (profil-løs f4d68672…) | 28 | 5,767,486 | 15,267,913 | 9,500,426 |
| tomarnejensen@gmail.com | 7 | 4,087,139 | 3,696,245 | -390,894 |
| (profil-løs ded5288d…) | 2 | 189,993 | 142,245 | -47,748 |
| (profil-løs 1a40e4f1…) | 2 | 184,367 | 182,908 | -1,459 |
| (profil-løs 782eb85b…) | 2 | 134,324 | 214,383 | 80,059 |
| palivarhjertholm@gmail.com | 1 | 130,493 | 210,483 | 79,990 |
| (profil-løs d2f80fcb…) | 1 | 101,390 | 100,000 | -1,390 |
| (profil-løs 1a15c6d2…) | 1 | 83,330 | 82,636 | -694 |
| (profil-løs 420d9fa0…) | 2 | 79,506 | 176,909 | 97,403 |
| (profil-løs 68c65032…) | 1 | 77,828 | 97,655 | 19,827 |
| (profil-løs a6b6f8c6…) | 1 | 77,701 | 77,280 | -421 |
| **TOTALT** | **388** | **103,000,296,025** | **133,216,463** | **-102,867,079,561** |

Sesjoner floored fra negativ kapital til 0: **47**
Sesjoner uten rate-data (fallback 9.6): **124**

## Største enkelt-endringer

| Sesjon | Bruker | Status | Gammel kapital | Ny kapital | Gammel P&L | Ny P&L | Trades |
|---|---|---|---|---|---|---|---|
| `5f6df628…` (dca) | 814b8c67… | stopped | 100,381,559,065 | 0 | 0 | -60,741,970 | 595 |
| `c5449d44…` (dca) | 814b8c67… | stopped | 2,483,347,471 | 100,000 | 2,243,424,781 | 0 | 80 |
| `b9e0faf1…` (dca) | f91a1f43… | active | 23,429,504 | 12,431,622 | -2,149,531 | 12,331,674 | 379 |
| `87f020f5…` (cron_c709023f) | 4211b1c7… | active | 10,823,141 | 1,126,521 | 9,503,197 | 1,031,255 | 54 |
| `35601e5b…` (dca) | 10de2b9b… | stopped | 4,967,720 | 143,227 | 387,704 | 43,232 | 81 |
| `a9b9c20b…` (dca) | tomarnejensen@gmail.com | active | 1,485,075 | 99,746 | 1,336,190 | -208 | 64 |
| `66fc050d…` (dca) | 67db9b24… | stopped | 888,058 | 163,105 | 558,470 | 63,185 | 34 |
| `cd363193…` (cron_4403c6a5) | 165b894d… | active | 652,926 | 0 | -556,373 | -58,602 | 69 |
| `9a722422…` (auto_cron) | 7734a444… | stopped | 706,429 | 100,000 | 64 | 0 | 1 |
| `2e17b109…` (cron_e6a401bc) | 7734a444… | stopped | 603,764 | 0 | -537 | 0 | 3 |
| `b497854f…` (dca) | eb292ddd… | stopped | 548,447 | 10,000 | -55 | 0 | 2 |
| `9c4cfc6b…` (dca) | tomarnejensen@gmail.com | stopped | 577,693 | 52,711 | -5,302 | -44,574 | 3 |
| `6d865625…` (dca) | eb292ddd… | stopped | 527,238 | 10,000 | 352 | 0 | 2 |
| `120df1d7…` (cron_2feccfe5) | 4bd58f81… | stopped | 706,886 | 229,574 | 645,770 | 219,928 | 48 |
| `ad3bf442…` (cron_c1b23dec) | 4211b1c7… | crashed | 448,843 | 0 | 174,113 | 1,758,429 | 43 |
