#!/bin/bash

# Check if the correct number of arguments is provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <folder_path> <number_of_files>"
    exit 1
fi

# Assign arguments to variables
FOLDER_PATH=$1
NUM_FILES=$2

# Check if the folder exists
if [ ! -d "$FOLDER_PATH" ]; then
    echo "Error: Folder '$FOLDER_PATH' does not exist."
    exit 1
fi

# Check if the number of files to delete is valid
if ! [[ $NUM_FILES =~ ^[0-9]+$ ]]; then
    echo "Error: Number of files to delete must be a positive integer."
    exit 1
fi

# Find and delete the specified number of files
FILES_DELETED=0
for FILE in "$FOLDER_PATH"/*; do
    if [ -f "$FILE" ]; then
        rm "$FILE"
        FILES_DELETED=$((FILES_DELETED + 1))
        if [ "$FILES_DELETED" -ge "$NUM_FILES" ]; then
            break
        fi
    fi
done

echo "Deleted $FILES_DELETED file(s) from '$FOLDER_PATH'."

exit 0
