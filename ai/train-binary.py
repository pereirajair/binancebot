import os, os.path
import sys
import tensorflow as tf
from dotenv import load_dotenv

load_dotenv()

api_symbol = os.getenv('SYMBOL')
model_path = './models/' + api_symbol + '.h5'
weights_path = './models/' + api_symbol + '.weights.h5'

# If you like to speed up training process with GPU, first install PlaidML and then uncomment the following line.
# Otherwise it will fallback to tensorflow.

#os.environ["KERAS_BACKEND"] = "plaidml.keras.backend"
os.environ["TF_USE_LEGACY_KERAS"]="1"

from tensorflow.keras.layers import Convolution2D, MaxPooling2D, Conv2D, Dropout, Flatten, Dense, Activation, BatchNormalization
from tensorflow.keras.models import Sequential
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras import optimizers
from tensorflow.keras.callbacks import ModelCheckpoint

DEV = False
argvs = sys.argv
argc = len(argvs)

tf_version = tf.__version__
print(tf_version)

if argc > 1 and (argvs[1] == "--development" or argvs[1] == "-d"):
  DEV = True

if DEV:
  epochs = 10
else:
  epochs = 10

# BEFORE STARTING TRAINING YOU NEED TO MANUALLY TAKE 20 PERCENT OF THE TRAINING DATA AND PUT IT INTO VALIDATION FOLDER

train_data_dir = '../data/train/'
validation_data_dir = '../data/test/'

# Input the size of your sample images
img_width, img_height = 150, 150


# Enter the number of samples, training + validation
DIR = '../data/train/buy/'
qtdbuy = len([name for name in os.listdir(DIR) if os.path.isfile(os.path.join(DIR, name))])
DIR = '../data/train/sell/'
qtdsell = len([name for name in os.listdir(DIR) if os.path.isfile(os.path.join(DIR, name))])
DIR = '../data/test/buy/'
qtdtestbuy = len([name for name in os.listdir(DIR) if os.path.isfile(os.path.join(DIR, name))])
DIR = '../data/test/sell/'
qtdtestsell = len([name for name in os.listdir(DIR) if os.path.isfile(os.path.join(DIR, name))])

DIR = '../data/train/wait/'
qtdwait = len([name for name in os.listdir(DIR) if os.path.isfile(os.path.join(DIR, name))])
DIR = '../data/test/wait/'
qtdtestwait = len([name for name in os.listdir(DIR) if os.path.isfile(os.path.join(DIR, name))])


nb_train_samples = qtdbuy + qtdsell + qtdtestbuy + qtdwait + qtdtestwait + qtdtestsell 
nb_validation_samples = qtdtestbuy + qtdtestsell + qtdtestwait
print(nb_train_samples)
print(nb_validation_samples)

# nb_train_samples = 413
# nb_validation_samples = 81
nb_filters1 = 32
nb_filters2 = 32
nb_filters3 = 64
conv1_size = 3
conv2_size = 2
conv3_size = 5
pool_size = 2
# We have 2 classes, buy and sell 
classes_num = 3
batch_size = 32
lr = 0.001
chanDim =3
val_accuracy = 1




model = Sequential()
model.add(Conv2D(nb_filters1, (conv1_size, conv1_size), input_shape=(img_height, img_width , 3), padding ="same"))
model.add(Activation('relu'))
model.add(MaxPooling2D(pool_size=(pool_size, pool_size)))

model.add(Conv2D(nb_filters2, (conv2_size, conv2_size), padding ="same"))
model.add(Activation('relu'))
model.add(MaxPooling2D(pool_size=(pool_size, pool_size), data_format='channels_first'))

model.add(Conv2D(nb_filters3, (conv3_size, conv3_size), padding ='same'))
model.add(Activation('relu'))
model.add(MaxPooling2D(pool_size=(pool_size, pool_size), data_format='channels_first'))

model.add(Flatten())
model.add(Dense(1024))
model.add(Activation('relu'))
model.add(Dropout(0.5))
model.add(Dense(classes_num, activation='softmax'))

model.summary()
model.compile(
  loss='categorical_crossentropy',
                      optimizer=optimizers.RMSprop(learning_rate=0.01),
                      metrics=['accuracy'])

train_datagen = ImageDataGenerator(
    #rescale=1. / 255,
    horizontal_flip=False)

test_datagen = ImageDataGenerator(
    #rescale=1. / 255,
    horizontal_flip=False)

train_generator = train_datagen.flow_from_directory(
    train_data_dir,
    target_size=(img_height, img_width),
    shuffle=True,
    batch_size=batch_size,
    class_mode='categorical'
)

validation_generator = test_datagen.flow_from_directory(
    validation_data_dir,
    target_size=(img_height, img_width),
    batch_size=batch_size,
    shuffle=True,
    class_mode='categorical'
    )

"""
Tensorboard log
"""
target_dir = "./models/weights-improvement-{epoch:02d}-{val_accuracy:.2f}.keras"
if not os.path.exists(target_dir):
  os.mkdir(target_dir)
model.save(model_path,save_format='h5')
model.save_weights(weights_path)

checkpoint = ModelCheckpoint(target_dir, monitor='val_accuracy', verbose=1, save_best_only=True, mode='max')
callbacks_list = [checkpoint]

model.fit(
    train_generator,
    steps_per_epoch=nb_train_samples//batch_size,
    epochs=epochs,
    shuffle=True,
    validation_data=validation_generator,
    callbacks=callbacks_list,
    validation_steps=nb_validation_samples//batch_size)


