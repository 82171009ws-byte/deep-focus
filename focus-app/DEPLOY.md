# 本番反映手順書（Vercel: deep-focus-one.vercel.app）

## 1. 反映前の確認コマンド

デプロイ前に以下を実行して状態を確認する。

### 現在のブランチ確認

```bash
cd /Users/shuhei/Desktop/DEMO/focus-app
git branch --show-current
```

### 変更ファイル確認

```bash
git status
git diff --stat
```

### GitHub の remote 確認

```bash
git remote -v
```

### 直近コミット確認

```bash
git log -3 --oneline
```

---

## 2. 通常の本番反映手順（Git 連携）

修正が Git 管理下にある前提で、main（または production ブランチ）へ push すると Vercel が自動デプロイする。

### Step 1: 変更をステージング

```bash
cd /Users/shuhei/Desktop/DEMO/focus-app
git add .
# 特定ファイルだけなら: git add app/page.tsx
```

### Step 2: コミット

```bash
git commit -m "fix: タスク選択1本化・全画面表示・ノイズ初期値・resetTimer削除"
```

### Step 3: リモートへ push

```bash
# production が main の場合
git push origin main

# production が master の場合
# git push origin master

# ブランチ名は「4. Vercel 側で確認すべきポイント」で確認
```

### Step 4: Vercel でデプロイ確認

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 対象プロジェクト（deep-focus-one）を開く
3. **Deployments** タブで直近のデプロイが「Building」→「Ready」になるまで待つ
4. 本番 URL（https://deep-focus-one.vercel.app）で表示・動作確認

---

## 3. Vercel 側で確認すべきポイント

Git 連携で反映されない場合、以下を確認する。

### Project Settings → Git

- **Connected Git Repository**: 正しい GitHub リポジトリが紐づいているか
- リポジトリが未連携なら「Connect Git Repository」で接続

### Project Settings → Git → Production Branch

- **Production Branch** の値（例: `main` または `master`）を確認
- このブランチへの push だけが本番デプロイになる
- 手順 2 の `git push origin <ブランチ名>` はここで確認した名前に合わせる

### Deployments

- 対象ブランチへの push 後に新しい Deployment が作成されているか
- 失敗している場合は「View Function Logs」や「Building」ログでエラー確認
- **Promote to Production**: 手動で別ブランチのデプロイを本番に昇格できる

---

## 4. Git 連携でうまくいかない場合（CLI で直接本番反映）

Vercel CLI でローカルから直接本番へデプロイする。

### 初回のみ: Vercel ログイン・プロジェクトリンク

```bash
cd /Users/shuhei/Desktop/DEMO/focus-app
npx vercel login
npx vercel link
# 対話で既存プロジェクト deep-focus-one を選択
```

### 本番デプロイ（上記リンク済みの場合）

```bash
cd /Users/shuhei/Desktop/DEMO/focus-app
npx vercel --prod
```

- ビルド・デプロイが完了すると本番 URL が表示される
- Git の履歴には残らないが、本番環境には反映される

---

## 5. 反映されない時のチェックポイント

| 確認項目 | コマンド・場所 |
|----------|----------------|
| push したブランチが Production Branch か | Vercel → Project Settings → Git → Production Branch |
| リモートに push できているか | `git log origin/main -1`（main の場合は main） |
| ビルドが成功しているか | ローカルで `npm run build`、Vercel Deployments のログ |
| キャッシュ・古いデプロイ表示 | ブラウザハードリロード、別タブ or シークレットで確認 |
| 環境変数が必要か | Vercel → Project Settings → Environment Variables |

---

## 最短でやるならこの3コマンド

```bash
cd /Users/shuhei/Desktop/DEMO/focus-app
git add . && git commit -m "fix: タスク選択1本化・全画面・ノイズ初期値・resetTimer削除"
git push origin main
```

※ `main` は Vercel の **Production Branch** に合わせて `master` などに変更する。
