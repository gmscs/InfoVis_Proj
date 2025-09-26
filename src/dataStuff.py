import pandas as pd

df = pd.read_csv('../dataset/crocodile_dataset_processed.csv')
column_name = 'country'
unique_count = df[column_name].nunique()
unique_values = df[column_name].unique()

print(column_name, "\n")
print(unique_count, "\n")
print(unique_values)

unique_values.sort()

# ...existing code...
for val in unique_values:
    print(f'<option value="{val}">{val}</option>')