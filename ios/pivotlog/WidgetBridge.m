//
//  WidgetBridge.m
//  pivotlog
//
//  Objective-C ブリッジヘッダー
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (WidgetBridge, NSObject)

RCT_EXTERN_METHOD(updateWidgetData : (NSDictionary *)data resolver : (
    RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadAllWidgets : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isWidgetAvailable : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

@end
