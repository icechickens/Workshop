#!/bin/bash

#### SageMaker Code Edit への Amazon Q Developer CLI のインストール ####

# Desktopディレクトリが存在しない場合は作成
mkdir -p ~/Desktop

# Desktopディレクトリに移動
cd ~/Desktop

# Amazon Q Developer CLIパッケージをダウンロード
echo "Amazon Q Developer CLIパッケージをダウンロード中..."
curl --proto '=https' --tlsv1.2 -sSf https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.deb -o amazon-q.deb

# aptパッケージリストを更新
echo "aptパッケージリストを更新中..."
sudo apt update -y

# debファイルを/usr/local/binにコピー
echo "debファイルを/usr/local/binにコピー中..."
sudo cp amazon-q.deb /usr/local/bin/

# /usr/local/binでパッケージをインストール
echo "Amazon Q Developer CLIをインストール中..."
cd /usr/local/bin
sudo apt install -y ./amazon-q.deb

echo "Amazon Q Developer CLIのインストールが完了しました！"
echo "これで 'q' コマンドを使用してAmazon Q Developer CLIにアクセスできます。"
echo "まずは 'q login' コマンドを使用してAWS Builder ID でログインしましょう。"
