//
//  DynamicIslandBridge.m
//  UMALL
//
//  Created by Shogen Minami on 2022/11/2.
//

#import <React/RCTBridgeModule.h>


@interface RCT_EXTERN_MODULE(DynamicIslandModule, NSObject)

RCT_EXTERN_METHOD(startBusReminder:(NSString)title withMessage:(int)message)
RCT_EXTERN_METHOD(updateBusReminder:(int)message)
RCT_EXTERN_METHOD(endBusReminder)

@end
