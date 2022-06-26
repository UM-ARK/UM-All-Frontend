import React from 'react'
import {View,Text} from 'react-native';
import StickyParallaxHeader from 'react-native-sticky-parallax-header'

const TestScreen = () => (
    <>
        <StickyParallaxHeader headerType="TabbedHeader" 
            tabs={[
                {
                title: 'Popular',
                // content: this.renderContent('Popular Quizes'),
                },
                {
                title: 'Product Design',
                // content: this.renderContent('Product Design'),
                },
                {
                title: 'Development',
                // content: this.renderContent('Development'),
                },
                {
                title: 'Project Management',
                // content: this.renderContent('Project Management'),
                },
            ]}
        />
        {/* <StickyParallaxHeader headerType="AvatarHeader" /> */}
        {/* <StickyParallaxHeader headerType="DetailsHeader" /> */}
    </>
)

export default TestScreen