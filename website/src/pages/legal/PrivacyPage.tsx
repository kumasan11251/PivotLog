import {
  LegalLayout,
  LegalSection,
  LegalSubheading,
  LegalParagraph,
  LegalList,
  LegalLink,
  LegalTable,
  LegalTh,
  LegalTd,
} from './LegalLayout';

export function PrivacyPage() {
  return (
    <LegalLayout title="プライバシーポリシー" updated="最終更新日: 2026年4月1日">
      <LegalParagraph>
        PivotLog（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。本プライバシーポリシーは、本アプリがどのような情報を収集し、どのように使用するかを説明します。
      </LegalParagraph>

      <LegalSection title="1. 収集する情報">
        <LegalSubheading>1.1 ユーザーが提供する情報</LegalSubheading>
        <LegalList>
          <li>
            <b>アカウント情報</b>: メールアドレス、または連携するGoogle/Appleアカウントの識別情報
          </li>
          <li>
            <b>匿名認証</b>:
            アカウント登録を行わずにアプリを利用する場合、Firebase Anonymous Authenticationにより匿名ユーザーとしてサインインされます。この場合も、内部的にユーザー識別子（UID）が自動生成され、データの保存・同期に使用されます
          </li>
          <li>
            <b>プロフィール情報</b>: 生年月日、目標寿命
          </li>
          <li>
            <b>日記データ</b>: 日々の振り返り内容（良かったこと、後悔、明日やりたいこと）
          </li>
        </LegalList>

        <LegalSubheading>1.2 通知機能に関する情報</LegalSubheading>
        <LegalParagraph>
          本アプリは、利用状況の分析やデバイス情報の収集を行う分析・解析ツール（Firebase Analytics、Crashlytics等）を一切組み込んでいません。自動的に取得・送信される情報は、以下の通知トークンのみです。
        </LegalParagraph>
        <LegalList>
          <li>
            <b>プッシュ通知トークン</b>:
            リマインダー通知機能を有効にした場合、expo-notificationsを通じてプッシュ通知トークンが生成されます。このトークンはExpoのプッシュ通知サーバーを経由して通知の配信に使用され、デバイスのローカルストレージに保存されます。Firestoreへの保存は行いません
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="2. 情報の使用目的">
        <LegalParagraph>収集した情報は、以下の目的で使用します：</LegalParagraph>
        <LegalList>
          <li>アプリの基本機能の提供（日記の保存、カウントダウン表示など）</li>
          <li>AI機能の提供</li>
          <li>機能提供に必要な保守</li>
          <li>ユーザーからのお問い合わせへの対応・ユーザーサポートの提供</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. AI機能について">
        <LegalParagraph>本アプリでは、Google Gemini APIを使用したAI機能を提供しています。</LegalParagraph>

        <LegalSubheading>3.1 送信されるデータ</LegalSubheading>
        <LegalParagraph>AI機能を使用する際、以下のデータがGoogle Gemini APIに送信されます：</LegalParagraph>
        <LegalList>
          <li>日記に入力された内容（良かったこと、後悔、明日やりたいこと）</li>
          <li>ユーザーの年齢と目標寿命（パーソナライズのため）</li>
        </LegalList>

        <LegalSubheading>3.2 データの使用目的</LegalSubheading>
        <LegalList>
          <li>日記の内容を分析し、今日の気づきや週間・月間ふりかえりを生成するためにのみ使用されます</li>
          <li>
            本アプリは有料（Paid Services）として Gemini API を利用しており、
            <LegalLink href="https://ai.google.dev/gemini-api/terms">Gemini API 追加利用規約</LegalLink>
            の Paid Services 条項に基づき、送信されたプロンプトおよびその応答が Google の製品改善（AIモデルの学習等）に使用されることはありません
          </li>
          <li>
            ただし、安全性の確保・不正利用の防止等の目的で、Googleの規約に基づき限定的な期間ログが保持される場合があります
          </li>
        </LegalList>

        <LegalSubheading>3.3 データの保存</LegalSubheading>
        <LegalList>
          <li>生成された内容はお客様のアカウントに紐づけて保存されます</li>
          <li>元の日記内容がGoogleに永続的に保存されることはありません</li>
        </LegalList>

        <LegalSubheading>3.4 第三者への提供</LegalSubheading>
        <LegalList>
          <li>日記の内容はGoogle Gemini APIに送信されます</li>
          <li>Gemini API 追加利用規約（Paid Services条項を含む）に基づいて処理されます</li>
          <li>
            詳細:{' '}
            <LegalLink href="https://ai.google.dev/gemini-api/terms">
              https://ai.google.dev/gemini-api/terms
            </LegalLink>
          </li>
        </LegalList>

        <LegalSubheading>3.5 同意の取得</LegalSubheading>
        <LegalList>
          <li>AI機能の初回使用時に、明示的な同意を取得します</li>
          <li>同意はいつでも設定画面から取り消すことができます</li>
        </LegalList>

        <LegalSubheading>3.6 AI生成コンテンツについて</LegalSubheading>
        <LegalList>
          <li>AIが生成する内容は参考情報であり、専門家のアドバイスではありません</li>
          <li>医療、法律、金融に関する重要な判断には、専門家にご相談ください</li>
          <li>不適切な内容が生成された場合は、アプリ内の報告機能からお知らせください</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. データの保存と保護">
        <LegalSubheading>4.1 保存場所</LegalSubheading>
        <LegalList>
          <li>ユーザーデータはGoogle Firebase（Firestore）に安全に保存されます</li>
          <li>データは暗号化された通信（HTTPS/TLS）を通じて送受信されます</li>
        </LegalList>

        <LegalSubheading>4.2 セキュリティ対策</LegalSubheading>
        <LegalList>
          <li>Firebase Authenticationによる認証</li>
          <li>Firestoreセキュリティルールによるアクセス制御</li>
          <li>ユーザーは自分のデータのみアクセス可能</li>
          <li>Firebase Admin SDKの認証情報は環境変数として管理し、ソースコードに含めない</li>
          <li>Cloud Functionsへのアクセスは認証済みユーザーのみに制限</li>
        </LegalList>

        <LegalSubheading>4.3 データの保持期間</LegalSubheading>
        <LegalList>
          <li>
            アカウント削除後、Firestore上に保存されたすべてのユーザーデータ（日記、設定、プロフィール情報等）は30日以内に完全に消去されます
          </li>
          <li>自動バックアップに含まれるデータについても、バックアップの保持期間（最大180日）の経過後に消去されます</li>
          <li>
            Cloud Functions経由でGoogle Gemini APIに送信された日記データは、Gemini API 追加利用規約の Paid Services 条項に基づき、Google の製品改善（AIモデルの学習等）には使用されません。ただし、安全性の確保・不正利用の防止等の目的で、Googleの規約に基づき限定的な期間ログが保持される場合があります
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. 国際データ転送">
        <LegalParagraph>
          本アプリで収集されたデータは、以下の理由により日本国外のサーバーに転送される場合があります：
        </LegalParagraph>
        <LegalTable>
          <thead>
            <tr>
              <LegalTh>サービス</LegalTh>
              <LegalTh>提供元</LegalTh>
              <LegalTh>データ転送先の国</LegalTh>
              <LegalTh>個人情報保護制度の概要</LegalTh>
              <LegalTh>提供先が講じている保護措置</LegalTh>
            </tr>
          </thead>
          <tbody>
            <tr>
              <LegalTd>Firebase（Firestore / Authentication）</LegalTd>
              <LegalTd>Google LLC</LegalTd>
              <LegalTd>米国</LegalTd>
              <LegalTd>
                連邦レベルの包括的な個人情報保護法は存在しないが、FTC法によるプライバシー保護の執行、州法（CCPA等）による規制あり
              </LegalTd>
              <LegalTd>
                <LegalLink href="https://cloud.google.com/terms/data-processing-addendum">
                  Google Cloud Data Processing Addendum
                </LegalLink>
                に基づく契約上の保護措置。SOC 2/3、ISO 27001等の認証取得
              </LegalTd>
            </tr>
            <tr>
              <LegalTd>Gemini API</LegalTd>
              <LegalTd>Google LLC</LegalTd>
              <LegalTd>米国</LegalTd>
              <LegalTd>同上</LegalTd>
              <LegalTd>
                <LegalLink href="https://ai.google.dev/gemini-api/terms">
                  Gemini API 追加利用規約
                </LegalLink>
                （Paid Services条項）に基づく保護措置。送信されたプロンプトおよび応答はGoogleの製品改善（モデルの学習等）に使用されない
              </LegalTd>
            </tr>
            <tr>
              <LegalTd>Expoプッシュ通知サーバー</LegalTd>
              <LegalTd>Expo (650 Industries, Inc.)</LegalTd>
              <LegalTd>米国</LegalTd>
              <LegalTd>同上</LegalTd>
              <LegalTd>プッシュ通知トークンと通知内容のみを処理し、配信後に保持しない</LegalTd>
            </tr>
            <tr>
              <LegalTd>RevenueCat</LegalTd>
              <LegalTd>RevenueCat, Inc.</LegalTd>
              <LegalTd>米国</LegalTd>
              <LegalTd>同上</LegalTd>
              <LegalTd>
                <LegalLink href="https://www.revenuecat.com/dpa">RevenueCat DPA</LegalLink>
                に基づく契約上の保護措置
              </LegalTd>
            </tr>
          </tbody>
        </LegalTable>
        <LegalParagraph>
          これらのサービスにおけるデータ転送は、各サービス提供者との契約（Data Processing Addendum等）に基づき、適切な保護措置が講じられた上で行われます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Cookieおよび類似技術">
        <LegalParagraph>
          本アプリはWebブラウザベースのアプリケーションではないため、一般的なCookieは使用しません。ただし、Firebase SDKが認証状態の管理やサービスの提供のために、デバイス上にローカルストレージやトークンなどの類似技術を使用する場合があります。これらはアプリの正常な動作に必要なものであり、広告やトラッキング目的では使用されません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. サブスクリプション（課金）について">
        <LegalParagraph>
          本アプリでは、プレミアム機能の提供にあたり、RevenueCat, Inc.のサービスを利用して購入処理およびサブスクリプション状態の管理を行っています。
        </LegalParagraph>

        <LegalSubheading>7.1 RevenueCatに送信されるデータ</LegalSubheading>
        <LegalList>
          <li>購入履歴およびサブスクリプションの状態</li>
          <li>匿名化されたユーザー識別子</li>
        </LegalList>

        <LegalSubheading>7.2 データの使用目的</LegalSubheading>
        <LegalList>
          <li>サブスクリプションの有効性確認および管理</li>
          <li>購入レシートの検証</li>
        </LegalList>

        <LegalSubheading>7.3 RevenueCatのプライバシーポリシー</LegalSubheading>
        <LegalParagraph>RevenueCatのデータ取り扱いについては、以下をご確認ください：</LegalParagraph>
        <LegalList>
          <li>
            <LegalLink href="https://www.revenuecat.com/privacy/">RevenueCat Privacy Policy</LegalLink>
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. データの共有">
        <LegalParagraph>以下の場合を除き、ユーザーの個人情報を第三者と共有することはありません：</LegalParagraph>
        <LegalList>
          <li>ユーザーの同意がある場合</li>
          <li>法律で要求される場合</li>
          <li>本プライバシーポリシーに記載されたサービス提供者（Google、RevenueCat）との共有</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="9. ユーザーの権利">
        <LegalParagraph>ユーザーは以下の権利を有します：</LegalParagraph>
        <LegalList>
          <li>
            <b>アクセス権</b>: 自分のデータにアクセスする権利
          </li>
          <li>
            <b>訂正権</b>: 不正確なデータの訂正を求める権利
          </li>
          <li>
            <b>削除権</b>: アカウントとすべてのデータの削除を求める権利
          </li>
          <li>
            <b>同意の撤回</b>: AI機能への同意をいつでも撤回する権利
          </li>
          <li>
            <b>データポータビリティ</b>: 自分のデータを構造化された一般的な形式で受け取る権利
          </li>
        </LegalList>
        <LegalParagraph>アカウントの削除は、アプリ内の設定画面から行うことができます。</LegalParagraph>
      </LegalSection>

      <LegalSection title="10. 子どものプライバシー">
        <LegalParagraph>
          本アプリは13歳以上のユーザーを対象としています。13歳以上18歳未満の方がご利用になる場合は、保護者の方の同意のもとでご利用いただくことを推奨します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. プライバシーポリシーの変更">
        <LegalParagraph>
          本プライバシーポリシーは、必要に応じて更新されることがあります。ただし、個人情報の利用目的を変更する場合は、変更前の利用目的と関連性を有すると合理的に認められる範囲内で行います。
        </LegalParagraph>
        <LegalParagraph>
          重要な変更（個人情報の利用目的の変更、新たな第三者提供先の追加等）がある場合は、変更の効力発生日の少なくとも7日前までにアプリ内通知またはメールにてお知らせし、必要に応じて改めて同意を取得します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="12. お問い合わせ">
        <LegalParagraph>プライバシーに関するご質問やご懸念がある場合は、以下までお問い合わせください：</LegalParagraph>
        <LegalList>
          <li>事業者: 村田健伍（個人開発者）</li>
          <li>所在地: 請求があった場合に遅滞なく開示いたします</li>
          <li>メール: kumasan.11251@gmail.com</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="13. 準拠法">
        <LegalParagraph>本プライバシーポリシーは、日本法に準拠して解釈されます。</LegalParagraph>
      </LegalSection>
    </LegalLayout>
  );
}
