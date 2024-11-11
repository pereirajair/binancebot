FROM bensuperpc/tensorflow:latest-jupyter

COPY ./ai/requirements.txt /var/www/requirements.txt
RUN cd /var/www/ && pip3 install -r requirements.txt

# RUN pip3 install flask && pip3 install flask_restful

RUN pip3 install python-binance flask-cors flask flask_restful python-dotenv mplfinance


ENV NODE_VERSION=12.9.0
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version

# COPY ./ai/src/models/trained/ /var/www/ai/src/models/trained/
#COPY ./ai/src/models/trained/btcbusd15min/ /var/www/ai/src/models/trained/btcbusd15min/
#COPY ./node_modules /var/www/node_modules
#COPY ./ai/data/predict/ /var/www/ai/data/predict/
#COPY ./require /var/www/require
#COPY ./run.sh /var/www/run.sh
#RUN npm install -g nodemon

#COPY ./ai/src/app.py /var/www/ai/src/app.py
#COPY ./ai/src/btestcalc.py /var/www/ai/src/btestcalc.py
#COPY ./configs/global/dragonboard.json /var/www/configs/global/dragonboard.json
#COPY ./ai.js /var/www/ai.js
#COPY ./configs /var/www/configs

#COPY ./ai/financial_data/ /var/www/ai/financial_data/

EXPOSE 5000
CMD [ "/var/www/run.sh" ]