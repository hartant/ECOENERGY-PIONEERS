"""Carte des colonnes : feuille « Données » du fichier Excel → noms propres.

Chaque entrée dit :
- letter  : la colonne dans Excel (le classeur garde la même mise en page chaque mois)
- name    : le nom propre utilisé dans la base et l'API (snake_case, unité à la fin)
- expect  : un texte qui DOIT apparaître dans l'en-tête de cette colonne.
            Si quelqu'un insère une colonne dans Excel, les lettres se décalent :
            le chargement s'arrête avec une erreur claire au lieu de lire de mauvaises données.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Col:
    letter: str
    name: str
    unit: str
    group: str
    description: str
    expect: str


SHEET = "Données"
DATE_LETTER = "B"
HEADER_ROWS = (3, 4, 5)  # en-têtes sur 3 lignes : groupe / sous-groupe / unité
FIRST_DATA_ROW = 7       # la ligne 6 est un résumé du « jour sélectionné », pas un vrai jour

COLUMNS: list[Col] = [
    # --- Eau (TED) -------------------------------------------------------
    Col("G",  "eau_dessalee_m3",        "m3/j", "eau", "Eau dessalée reçue (eau de mer traitée)", "Eau déssalée"),
    Col("H",  "step_m3",                "m3/j", "eau", "Eau envoyée à la STEP (épuration)", "STEP"),
    Col("N",  "dci_est_m3",             "m3/j", "eau", "Réseau incendie Est", "DCI Est"),
    Col("O",  "dci_ouest_m3",           "m3/j", "eau", "Réseau incendie Ouest", "DCI Ouest"),
    Col("AF", "wds_production_m3",      "m3/j", "eau", "Production d'eau désilicée (WDS) au TED", "Pr WDS"),
    Col("AG", "wdc_total_m3",           "m3/j", "eau", "Eau décarbonatée (WDC) totale", "WDC Total"),
    Col("CQ", "wds_consommation_m3",    "m3/j", "eau", "Consommation totale de WDS", "Cons WDS T"),
    Col("CS", "wds_vers_centrale_m3",   "m3/j", "eau", "WDS envoyée à la centrale (chaudières)", "Centrale"),
    Col("CU", "wds_vers_mc_m3",         "m3/j", "eau", "WDS envoyée à Maroc Chimie", "M C"),
    Col("CY", "wds_vers_sulfurique_m3", "m3/j", "eau", "WDS envoyée à l'unité sulfurique (LH)", "E D LH Sulf"),
    Col("CW", "eau_regeneration_ted_m3","m3/j", "eau", "Eau de régénération des résines (LH TED)", "E R LH TED"),
    Col("DA", "eau_phosphorique_m3",    "m3/j", "eau", "Eau vers phosphorique + divers", "Phosphorique"),
    Col("DN", "stock_wds_sulfurique_m3","m3",   "eau", "Stock WDS côté sulfurique (fin de journée)", "Stocks"),
    Col("FG", "soude_t",                "t/j",  "eau", "Soude caustique consommée (régénération)", "Soude"),
    Col("FH", "acide_sulfurique_t",     "t/j",  "eau", "H2SO4 consommé (régénération)", "H2SO4"),

    # --- Électricité -----------------------------------------------------
    Col("JB", "prod_gta3_mwh",          "MWh/j", "electricite", "Production électrique GTA3", "TA3"),
    Col("JF", "conso_usine_mwh",        "MWh/j", "electricite", "Consommation électrique du site", "consommation usine"),
    Col("HY", "recu_mc_hp_mwh",         "MWh/j", "electricite", "Reçu de Maroc Chimie, heures de pointe", "MC"),
    Col("IC", "recu_mc_hpl_mwh",        "MWh/j", "electricite", "Reçu de Maroc Chimie, heures pleines", "MC"),
    Col("IG", "recu_mc_hc_mwh",         "MWh/j", "electricite", "Reçu de Maroc Chimie, heures creuses", "MC"),
    Col("IA", "recu_onee_hp_mwh",       "MWh/j", "electricite", "Reçu de l'ONEE, heures de pointe", "ONE"),
    Col("IE", "recu_onee_hpl_mwh",      "MWh/j", "electricite", "Reçu de l'ONEE, heures pleines", "ONE"),
    Col("II", "recu_onee_hc_mwh",       "MWh/j", "electricite", "Reçu de l'ONEE, heures creuses", "ONE"),
    Col("IK", "recu_total_mwh",         "MWh/j", "electricite", "Énergie électrique reçue totale", "Quantité totale reçue"),
    Col("IL", "recu_montant_dh",        "DH/j",  "electricite", "Coût de l'énergie reçue", "Montant"),
    Col("IQ", "facture_dh_par_t_p2o5",  "DH/t P2O5", "electricite", "Facture énergétique ramenée à la production", "FACTURE"),

    # --- Vapeur ----------------------------------------------------------
    Col("JP", "vhp_gta3_t",             "t/j",  "vapeur", "Vapeur haute pression admise au GTA3", "TA3"),
    Col("JX", "soutirage_bp_t",         "t/j",  "vapeur", "Vapeur basse pression soutirée (vers CAP)", "SOUT 3"),
    Col("KO", "vapeur_recue_mc_t",      "t/j",  "vapeur", "Vapeur 8,5 bar reçue de Maroc Chimie", "Reçu MC"),
    Col("KV", "condensat_gta3_m3",      "m3/j", "vapeur", "Condensat récupéré au GTA3", "TA3 (CP3)"),

    # --- Production ------------------------------------------------------
    Col("HG", "acp_t_p2o5",             "t P2O5/j", "production", "Production d'acide phosphorique", "Production d'ACP"),

    # --- Disponibilité des équipements -----------------------------------
    Col("LE", "marche_gta3_h",          "h/j", "equipements", "Heures de marche GTA3", "TA3"),
    Col("LS", "arret_chaudiere_h",      "h/j", "equipements", "Heures d'arrêt chaudière principale", "Chaud principale"),
    Col("LT", "arret_gta1_h",           "h/j", "equipements", "Heures d'arrêt GTA1", "TA1"),
    Col("LU", "arret_gta2_h",           "h/j", "equipements", "Heures d'arrêt GTA2", "TA2"),
    Col("LV", "arret_gta3_h",           "h/j", "equipements", "Heures d'arrêt GTA3", "TA3"),
    Col("LO", "marche_zr400_1_h",       "h/j", "equipements", "Heures de marche compresseur ZR400 I", "ZR400-1"),
    Col("LP", "marche_zr400_2_h",       "h/j", "equipements", "Heures de marche compresseur ZR400 II", "ZR400-2"),
    Col("LQ", "marche_zr400_3_h",       "h/j", "equipements", "Heures de marche compresseur ZR400 III", "ZR400-3"),

    # --- Stocks ----------------------------------------------------------
    Col("DY", "stock_fuel_pct",         "%",   "stocks", "Stock fuel-oil fin de journée", "%"),
    Col("DZ", "stock_fuel_t",           "t",   "stocks", "Stock fuel-oil fin de journée", "Tonnes"),
    Col("EQ", "stock_gasoil_m3",        "m3",  "stocks", "Stock gas-oil fin de journée", "m3"),
]

# Colonnes calculées en Python (pas lues dans Excel) : nom → (unité, groupe, description)
DERIVED: dict[str, tuple[str, str, str]] = {
    "recu_mc_mwh":        ("MWh/j", "electricite", "Reçu de Maroc Chimie (HP + HPL + HC)"),
    "recu_onee_mwh":      ("MWh/j", "electricite", "Reçu de l'ONEE (HP + HPL + HC)"),
    "taux_couverture_pct":("%",     "electricite", "Part de la consommation couverte par la production propre"),
    "cs_vhp_t_par_mwh":   ("t/MWh", "vapeur",      "Consommation spécifique : tonnes de vapeur par MWh (cible 6,8 à 7,5)"),
    "dispo_gta1_pct":     ("%",     "equipements", "Disponibilité GTA1 = (24 - arrêt) / 24"),
    "dispo_gta2_pct":     ("%",     "equipements", "Disponibilité GTA2 = (24 - arrêt) / 24"),
    "dispo_gta3_pct":     ("%",     "equipements", "Disponibilité GTA3 = marche / 24"),
}
