import pandas as pd            

# Suppress SettingWithCopyWarning from pandas when modifying dataframes
pd.options.mode.chained_assignment = None

# Increase maximum number of rows displayed when printing a DataFrame
pd.options.display.max_rows = 9999

# ---------------------------------------------------------------------
# Step 1: Import dataset from CSV file into a DataFrame
df = pd.read_csv('../dataset/crocodile_dataset.csv')

# ---------------------------------------------------------------------
# Step 2: Remove rows with any missing values (NaNs)
def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    return df.dropna()

# ---------------------------------------------------------------------
# Step 3: Drop columns that won't be used in the analysis
def remove_features(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(["Observation ID", "Scientific Name", "Family", "Genus", "Observer Name", "Notes"], axis=1)

# ---------------------------------------------------------------------
# Step 4: Convert collumn names
def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    return df. rename(columns={
        "Common Name": "commonname",
        "Observed Length (m)": "lengthM",
        "Observed Weight (kg)": "weight",
        "Age Class": "age",
        "Sex": "sex",
        "Country/Region": "country",
        "Date of Observation": "date",
        "Habitat Type": "habitat",
        "Conservation Status": "conservation"
    })

# ---------------------------------------------------------------------
# Step 5: Convert and merge country names
def standardize_country_names(df: pd.DataFrame) -> pd.DataFrame:
    country_mapping = {
        "USA (Florida)": "United States of America",
        "Indonesia (Borneo)": "Indonesia",
        "Malaysia (Borneo)": "Malaysia",
        "Congo (DRC)": "Dem. Rep. Congo",
        "Indonesia (Papua)": "Indonesia",
        "Iran (historic)": "Iran",
        "Central African Republic": "Central African Rep.",
        "Congo Basin Countries": "Congo",
        "Congo Basin Countries": "Eq. Guinea"
    }

    congo_basin = df['country'] == "Congo Basin Countries"
    congo_basin_copy = df[congo_basin].copy()
    congo_basin1 = congo_basin_copy.copy()
    congo_basin2 = congo_basin_copy.copy()
    congo_basin1['country'] = "Congo"
    congo_basin2['country'] = "Eq. Guinea"

    df = pd.concat([df[~congo_basin], congo_basin1, congo_basin2])
    df['country'] = df['country'].replace(country_mapping)
    return df

# ---------------------------------------------------------------------
# Step 6: Full preprocessing pipeline
def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df
        .pipe(remove_features)   # Step 3
        .pipe(clean_dataset)     # Step 2
        .pipe(standardize_column_names)  # Step 4
        .pipe(standardize_country_names)  # Step 5
    )

# Run the preprocessing on the dataset
df = preprocess_data(df)

# ---------------------------------------------------------------------
# Step 10: Save final DataFrame to CSV and JSON
df.to_csv('../dataset/crocodile_dataset_processed.csv', index=False)                      # Save as CSV without row indices
df.to_json('../dataset/crocodile_dataset_processed.json', index=False, orient="records")  # Save as JSON, with each row as a record