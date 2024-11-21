import os
import sys
import tensorflow as tf
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Activation, BatchNormalization
from tensorflow.keras.models import Sequential
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from tensorflow.keras import optimizers
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()
api_symbol = os.getenv('SYMBOL')
model_path = f'./models/{api_symbol}.h5'
weights_path = f'./models/{api_symbol}.weights.h5'

# Configuração do backend
os.environ["TF_USE_LEGACY_KERAS"] = "1"

# Parâmetros de treinamento
IMG_WIDTH, IMG_HEIGHT = 150, 150
BATCH_SIZE = 32
EPOCHS_DEV = 5
EPOCHS_PROD = 50
LR = 0.001

# Diretórios dos dados
TRAIN_DIR = '../data/train/'
VAL_DIR = '../data/test/'

# Função para contar arquivos em uma classe
def count_files(directory):
    return len([f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))])

# Contagem de arquivos
train_buy = count_files(os.path.join(TRAIN_DIR, 'buy'))
train_sell = count_files(os.path.join(TRAIN_DIR, 'sell'))
train_wait = count_files(os.path.join(TRAIN_DIR, 'wait'))

val_buy = count_files(os.path.join(VAL_DIR, 'buy'))
val_sell = count_files(os.path.join(VAL_DIR, 'sell'))
val_wait = count_files(os.path.join(VAL_DIR, 'wait'))

nb_train_samples = train_buy + train_sell + train_wait
nb_validation_samples = val_buy + val_sell + val_wait

# Configuração do modo de desenvolvimento
DEV = len(sys.argv) > 1 and (sys.argv[1] == "--development" or sys.argv[1] == "-d")
epochs = EPOCHS_DEV if DEV else EPOCHS_PROD

print(f"Training samples: {nb_train_samples}")
print(f"Validation samples: {nb_validation_samples}")

# Construção do modelo
def build_model():
    model = Sequential([
        # Primeira camada convolucional
        Conv2D(32, (3, 3), padding='same', input_shape=(IMG_HEIGHT, IMG_WIDTH, 3)),
        BatchNormalization(),
        Activation('relu'),
        MaxPooling2D(pool_size=(2, 2)),
        
        # Segunda camada convolucional
        Conv2D(64, (3, 3), padding='same'),
        BatchNormalization(),
        Activation('relu'),
        MaxPooling2D(pool_size=(2, 2)),

        # Terceira camada convolucional
        Conv2D(128, (3, 3), padding='same'),
        BatchNormalization(),
        Activation('relu'),
        MaxPooling2D(pool_size=(2, 2)),

        # Camada fully connected
        Flatten(),
        Dense(256, activation='relu'),
        Dropout(0.5),
        Dense(3, activation='softmax')  # Três classes (buy, sell, wait)
    ])
    model.compile(
        loss='categorical_crossentropy',
        optimizer=optimizers.Adam(learning_rate=LR),
        metrics=['accuracy']
    )
    return model

# Instanciar o modelo
model = build_model()
model.summary()

# Pré-processamento dos dados
train_datagen = ImageDataGenerator(
    rescale=1. / 255,
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(
    rescale=1. / 255
)

train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=['buy', 'sell', 'wait']  # Adicionando a classe wait
)

validation_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=['buy', 'sell', 'wait']
)

# Checkpoints e callbacks
model_dir = './models'
os.makedirs(model_dir, exist_ok=True)

checkpoint = ModelCheckpoint(
    filepath=os.path.join(model_dir, 'weights-improvement-{epoch:02d}-{val_accuracy:.2f}.keras'),
    monitor='val_accuracy',
    verbose=1,
    save_best_only=True,
    mode='max'
)

early_stopping = EarlyStopping(
    monitor='val_accuracy',
    patience=5,
    verbose=1,
    restore_best_weights=True
)

callbacks = [checkpoint, early_stopping]

# Treinamento do modelo
model.fit(
    train_generator,
    steps_per_epoch=nb_train_samples // BATCH_SIZE,
    epochs=epochs,
    validation_data=validation_generator,
    validation_steps=nb_validation_samples // BATCH_SIZE,
    callbacks=callbacks,
    shuffle=True
)

# Salvamento final do modelo
model.save(model_path, save_format='h5')
model.save_weights(weights_path)
print(f"Model saved to {model_path}")
