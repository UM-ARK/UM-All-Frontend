package one.umall;

import android.app.Application;
import android.webkit.WebView;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.reactnativerestart.RestartPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;
import java.util.List;
import com.BV.LinearGradient.LinearGradientPackage; // 漸變庫需要
import com.wix.interactable.Interactable; // 拖動手勢庫需要
import com.reactnativecommunity.cameraroll.CameraRollPackage; // 圖片保存需要
import com.reactnativerestart.RestartPackage;  // <--- Import
// import com.mkuczera.RNReactNativeHapticFeedbackPackage; // 震動包
import com.reactnativecompressor.CompressorPackage;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());
          packages.add(new LinearGradientPackage());  // 漸變庫安裝需要
          packages.add(new Interactable());           // 拖動手勢庫需要
          // packages.add(new RestartPackage());           // 重啟庫需要
          // packages.add(new CameraRollPackage());      // 圖片保存需要
          // packages.add(new RNReactNativeHapticFeedbackPackage());      // 震動
          
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

  @Override
    protected boolean isNewArchEnabled() {
      return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
    }

    @Override
    protected Boolean isHermesEnabled() {
      return BuildConfig.IS_HERMES_ENABLED;
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
    ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
  }
}
